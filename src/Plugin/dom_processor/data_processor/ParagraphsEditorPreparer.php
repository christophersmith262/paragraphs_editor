<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_preparer",
 *   label = "Paragraphs Editor Preparer"
 * )
 */
class ParagraphsEditorPreparer implements ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  protected $contextFactory;
  protected $widgetData;
  protected $expanded = [];
  protected $count = 1;

  /**
   *
   */
  public function __construct($field_value_manager, $context_factory, $markup_compiler) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager);
    $this->contextFactory = $context_factory;
    $this->markupCompiler = $markup_compiler;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('paragraphs_editor.command.context_factory'),
      $container->get('paragraphs_editor.widget_binder.data_compiler')
    );
  }

  /**
   *
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if (!$data->has('preparer.ready')) {
      if ($data->isRoot()) {
        return $this->generateOwnerInfo($data, $result);
      }
    }
    else {
      if ($this->is($data, 'widget')) {
        $paragraph = $data->get('paragraph.entity');
        $field_context_id = $data->get('field.context_id');
        $this->_expandParagraph($data, $data->node(), $paragraph, $field_context_id);
      }
      elseif ($data->isRoot()) {
        return $this->finishResult($data, $result);
      }
    }
    return $result;
  }

  /**
   *
   */
  protected function generateOwnerInfo(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $data = $data->tag('preparer', [
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

  /**
   *
   */
  protected function _expandParagraph($data, $paragraph_node, $entity, $field_context_id = NULL) {

    if ($field_context_id) {
      $this->setAttribute($paragraph_node, 'widget', '<context>', $field_context_id);

      $prerender_count = 1;
      $prerender_count = $data->get('settings.prerender_count');
      if ($prerender_count > -1 && $this->count < $prerender_count) {
        $context = $this->contextFactory->get($field_context_id);
        $item = $context->getEditBuffer()->createItem($entity);
        $view_mode = $data->get('settings.view_mode');
        $langcode = $data->get('langcode');
        $this->widgetData = $this->widgetData->merge($this->markupCompiler->compile($context, $item, $view_mode, $langcode));
        $this->count++;
      }
    }

    foreach ($entity->getFields() as $items) {
      $field_definition = $items->getFieldDefinition();

      if ($this->fieldValueManager->isParagraphsField($field_definition)) {
        $field_node = $this->createElement($paragraph_node->ownerDocument, 'field', [
          '<name>' => $field_definition->getName(),
        ]);

        if ($this->fieldValueManager->isParagraphsEditorField($field_definition)) {

          $context_id = $this->widgetData->getContextId($entity->uuid(), $field_definition->id());
          if (!$context_id) {
            return;
          }

          $this->setAttribute($field_node, 'field', '<editable>', 'true');
          $this->setAttribute($field_node, 'field', '<context>', $context_id);

          $wrapper = $this->fieldValueManager->wrapItems($items);
          foreach ($wrapper->getReferencedEntities() as $child_entity) {
              $child_paragraph_node = $this->createElement($field_node->ownerDocument, 'widget', [
                '<uuid>' => $child_entity->uuid(),
              ]);
              $this->_expandParagraph($data, $child_paragraph_node, $child_entity, $context_id);
              $field_node->appendChild($child_paragraph_node);
            }
        }
        else {
          foreach ($this->fieldValueManager->getReferencedEntities($items) as $child_entity) {
            $child_paragraph_node = $this->createElement($field_node->ownerDocument, 'widget', [
              '<uuid>' => $child_entity->uuid(),
            ]);
            $this->_expandParagraph($data, $child_paragraph_node, $child_entity);
            $field_node->appendChild($child_paragraph_node);
          }
        }
        $paragraph_node->appendChild($field_node);
      }
    }
  }

  /**
   *
   */
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
        $this->fieldValueManager->getAttributeName('field', '<context>') => $data->get('field.context_id'),
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

}
