<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\paragraphs_editor\EditorCommand\WidgetBinderData;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

abstract class MultipassDataProcessor implements DataProcessorInterface {

  protected $passKeys = [];
  protected $passCallbackMap = [];
  protected $passFsmMap = [];
  protected $tagId;

  public function __construct($tag_id) {
    $this->tagId = $tag_id;
    $last_key = NULL;
    foreach ($this->passes() as $key => $cb) {
      $this->passKeys[] = $key;
      $this->passCallbackMap[$key] = $cb;
      if ($last_key) {
        $this->passFsmMap[$last_key] = $key;
      }
      $last_key = $key;
    }
  }

  abstract protected function passes();

  protected function passTransition(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $current_pass = $data->get($this->tagId . '.pass');
    if (!$current_pass) {
      $next_pass = reset($this->passKeys);
    }
    else {
      $next_pass = !empty($this->passFsmMap[$current_pass]) ? $this->passFsmMap[$current_pass] : NULL;
    }

    if ($next_pass) {
      return $result->reprocess($data->tag($this->tagId, [
        'pass' => $next_pass,
      ], TRUE));
    }
    else {
      return $result;
    }
  }

  protected function passCallback(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $pass = $data->get($this->tagId . '.pass');
    $cb = !empty($this->passCallbackMap[$pass]) ? $this->passCallbackMap[$pass] : NULL;
    return call_user_func($cb, $data, $result);
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if (!$data->has($this->tagId . '.pass')) {
      return $this->passTransition($data, $result);
    }
    else {
      $result = $this->passCallback($data, $result);

      if ($data->isRoot()) {
        $result = $this->passTransition($data, $result);
      }

      return $result;
    }
  }

}

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_decorator",
 *   label = "Paragraphs Editor Decorator"
 * )
 */
class ParagraphsEditorDecorator extends MultiPassDataProcessor implements ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  protected $contextFactory;
  protected $widgetData;
  protected $expanded = [];

  public function __construct($field_value_manager, array $elements, $context_factory, $markup_compiler) {
    parent::__construct('decorator');
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
    $this->contextFactory = $context_factory;
    $this->markupCompiler = $markup_compiler;
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements'),
      $container->get('paragraphs_editor.command.context_factory'),
      $container->get('paragraphs_editor.edit_buffer.markup_compiler')
    );
  }

  /**
   * {@inheritdoc}
   */
  protected function passes() {
    return [
      'expand' => [$this, 'expand'],
      'contextualize' => [$this, 'contextualize'],
      'decorate' => [$this, 'decorate'],
    ];
  }

  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if (!$data->has('decorator.ready')) {
      return $this->generateOwnerInfo($data, $result);
    }
    return parent::process($data, $result);
  }

  protected function expand(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($this->is($data, 'widget')) {
      return $this->expandWidget($data, $result);
    }
    else if ($this->is($data, 'field')) {
      return $this->expandField($data, $result);
    }
    return $result;
  }

  protected function contextualize(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($this->is($data, 'widget')) {
      return $this->compileWidget($data, $result);
    }
    return $result;
  }

  protected function decorate(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($this->is($data, 'widget')) {
      return $this->decorateWidget($data, $result);
    }
    else if ($this->is($data, 'field')) {
      return $this->decorateField($data, $result);
    }
    else if ($data->isRoot()) {
      return $this->finishResult($data, $result);
    }
    return $result;
  }

  protected function generateOwnerInfo(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $data = $data->tag('decorator', [
      'ready' => TRUE,
    ], TRUE);

    $field_value_wrapper = $data->get('field.wrapper');
    if ($field_value_wrapper) {

      // Apply the default format if none is already provided.
      $filter_format = $field_value_wrapper->getFormat();

      // Create a new editing context for the field.
      $field_definition = $data->get('field.items')->getFieldDefinition();
      $owner_entity = $data->get('owner.entity');
      if ($field_definition && $owner_entity) {
        $settings = $data->get('settings');
        $context = $this->contextFactory->create($field_definition->id(), $owner_entity->id(), $settings);

        $widget_data = new WidgetBinderData();
        $widget_data->addModel('context', $context->getContextString(), [
          'id' => $context->getContextString(),
          'schemaId' => $field_definition->id(),
          'settings' => $settings,
          'bufferItems' => [],
        ]);
        $widget_data->addModel('schema', $field_definition->id(), [
          'id' => $field_definition->id(),
          'allowed' => [
            'paragraphs_editor_text' => TRUE,
            'tabs' => TRUE,
          ],
        ]);
        $this->widgetData = $widget_data;
        $data = $data->tag('field', [
          'context_id' => $context->getContextString(),
        ], TRUE);
      }
    }

    return $result->reprocess($data);
  }

  public function expandWidget(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $paragraph = $data->get('paragraph.entity');
    $context_id = $data->get('paragraph.context_id');
    $field_context_id = $data->get('field.context_id');
    $settings = $data->get('settings');
    if ($paragraph && !$this->isExpanded($paragraph)) {

      foreach ($paragraph->getFields() as $items) {
        $field_definition = $items->getFieldDefinition();
        if ($this->fieldValueManager->isParagraphsField($field_definition)) {
          $field_node = $data->node()->ownerDocument->createElement($this->getElement('field')['tag']);
          $attribute_name = $this->getAttributeName('field', '<name>');
          $field_node->setAttribute($attribute_name, $field_definition->getName());

          if ($this->fieldValueManager->isParagraphsEditorField($field_definition)) {
            $attribute_name = $this->getAttributeName('field', '<editable>');
            $field_node->setAttribute($attribute_name, 'true');
          }

          $data->node()->appendChild($field_node);
        }
      }

      $this->markExpanded($paragraph);
      return $result->reprocess();
    }
    else {
      return $result;
    }
  }

  public function compileWidget(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $field_context_id = $data->get('field.context_id');
    if ($field_context_id) {
      $context = $this->contextFactory->get($field_context_id);
      $item = $context->getEditBuffer()->createItem($data->get('paragraph.entity'));
      $this->widgetData = $this->widgetData->merge($this->markupCompiler->compile($context, $item));
    }
    return $result;
  }

  public function decorateWidget(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $field_context_id = $data->get('field.context_id');
    if ($field_context_id) { 
      $attribute_name = $this->getAttributeName('widget', '<context>');
      $data->node()->setAttribute($attribute_name, $field_context_id);
    }
    return $result;
  }

  public function expandField(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $is_mutable = $data->get('field.is_mutable');
    $context_id = $data->get('field.context_id');
    $paragraph = $data->get('paragraph.entity');
    $items = $data->get('field.items');
    if (!$is_mutable && !$data->node()->hasChildNodes() && $items->referencedEntities()) {
      foreach ($items->referencedEntities() as $entity) {
        $paragraph_node = $data->node()->ownerDocument->createElement($this->getElement('widget')['tag']);
        $attribute_name = $this->getAttributeName('widget', '<uuid>');
        $paragraph_node->setAttribute($attribute_name, $entity->uuid());
        $data->node()->appendChild($paragraph_node);
      }
      return $result->reprocess();
    }
    return $result;
  }

  public function decorateField(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $paragraph = $data->get('paragraph.entity');
    $is_mutable = $data->get('field.is_mutable');
    if ($is_mutable && !$data->get('field.context_id')) {
      $wrapper = $data->get('field.wrapper');
      $context_id = $this->widgetData->getContextId($paragraph->uuid(), $data->get('field.items')->getFieldDefinition()->id());
      $attribute_name = $this->getAttributeName('field', '<context>');
      $data->node()->setAttribute($attribute_name, $context_id);
      return $result->setInnerHtml($data, $wrapper->getMarkup())->reprocess();
    }
    else {
      return $result;
    }
  }

  protected function finishResult(SemanticDataInterface $data, DomProcessorResultInterface $result) {

    // Add the core paragraphs editor library.
    $result = $result->merge([
      'libraries' => [
        'paragraphs_editor/core',
      ],
    ]);

    // Add attributes for the editor.
    $result = $result->merge([
      'attributes' => [
        'class' => [
          'class' => 'paragraphs-editor',
        ],
        $this->getAttributeName('widget', '<context>') => $data->get('field.context_id'),
      ],
    ]);

    $result = $result->merge([
      'context_id' => $data->get('field.context_id'),
    ]);

    $result = $result->merge([
      'drupalSettings' => [
        'paragraphs_editor' => $this->widgetData->toArray(),
      ],
    ]);

    $result = $result->merge([
      'filter_format' => 'paragraphs_ckeditor',
    ]);

    return $result;
  }

  protected function isExpanded($paragraph) {
    return !empty($this->expanded[$paragraph->uuid()]);
  }

  protected function markExpanded($paragraph) {
    $this->expanded[$paragraph->uuid()] = TRUE;
  }
}
