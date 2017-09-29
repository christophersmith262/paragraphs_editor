<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\ParagraphsEditorElementTrait;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface;
use Drupal\paragraphs_editor\Utility\TypeUtility;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A DOM processor plugin for preparing markup for use in an editor.
 *
 * When an is editor field is saved, all the contextual editor information is
 * stripped from the DOM.
 *
 * Every time we go back to edit the field we generate a new editing context for
 * the field, and all child fields.
 *
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_preparer",
 *   label = "Paragraphs Editor Preparer"
 * )
 */
class ParagraphsEditorPreparer implements ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * The widget data collection that will be delivered to the client initially.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData
   */
  protected $widgetData = NULL;

  /**
   * A count of the number of entities that were prerendered for delivery.
   *
   * @var int
   */
  protected $count = 0;

  /**
   * The context factory for creating new edit contexts.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * The widget binder data compiler for generating prerendered entity models.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface
   */
  protected $dataCompiler;

  /**
   * Creates a paragraph editor preparation plugin.
   *
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service to initialize the element trait.
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory for generating new edit contexts.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface $data_compiler
   *   The widget binder data compiler service for generating dthe initial data
   *   binder models that will be delivered to the client.
   */
  public function __construct(FieldValueManagerInterface $field_value_manager, CommandContextFactoryInterface $context_factory, WidgetBinderDataCompilerInterface $data_compiler) {
    $this->initializeParagraphsEditorElementTrait($field_value_manager);
    $this->contextFactory = $context_factory;
    $this->dataCompiler = $data_compiler;
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
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($data->has('preparer.ready')) {
      if ($data->is($this->getSelector('widget'))) {
        $paragraph = $data->get('paragraph.entity');
        $field_context_id = $data->get('field.context_id');
        $this->expandParagraph($data, $data->node(), $paragraph, $field_context_id);
        return $result;
      }
      elseif ($data->isRoot()) {
        return $this->finishResult($data, $result);
      }
    }
    elseif ($data->isRoot()) {
      return $this->generateOwnerInfo($data, $result);
    }

    return $result;
  }

  /**
   * Initializes the widget binder data object that will be initially delivered.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current semantic data state.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface $result
   *   The current result object.
   *
   * @return \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface
   *   An updated result object instructing the processor to reprocess the tree.
   */
  protected function generateOwnerInfo(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $data = $data->tag('preparer', [
      'ready' => TRUE,
    ], TRUE);

    $field_value_wrapper = $data->get('field.wrapper');

    $data = $data->tag($field_value_wrapper->getFormat();

    // Create a new editing context for the field.
    $field_definition = $data->get('field.items')->getFieldDefinition();
    $owner_entity = $data->get('owner.entity');
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

    return $result->reprocess($data);
  }

  /**
   * Expands a widget embed code to include its children.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current semantic data state.
   * @param \DOMElement $paragraph_node
   *   The dom element to be expanded.
   * @param \Drupal\paragraphs\ParagraphInterface $entity
   *   The paragraph entity associated with the dom element.
   * @param string $field_context_id
   *   The id of the editing context to which the entity belongs.
   *
   * @note This function should not get contextual data from the $data variable.
   * All contextual information about the widget is passed as arguments to the
   * function. This is because the paragraph being expanded may not be the
   * paragraph the semantic data corresponds to.
   */
  protected function expandParagraph(SemanticDataInterface $data, \DOMElement $paragraph_node, ParagraphInterface $entity, $field_context_id = NULL) {

    if (empty($field_context_id)) {
      $this->setAttribute($paragraph_node, 'widget', '<context>', $field_context_id);

      $prerender_count = $data->get('settings.prerender_count');
      if ($prerender_count > -1 && $this->count < $prerender_count) {
        $this->compileParagraph($data, $entity, $field_context_id);
      }
    }

    foreach ($entity->getFields() as $items) {
      $field_definition = $items->getFieldDefinition();

      if ($this->fieldValueManager->isParagraphsField($field_definition)) {
        $items = TypeUtility::ensureEntityReferenceRevisions($items);

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

          $referenced_entities = $this->fieldValueManager->wrapItems($items)->getReferencedEntities();
        }
        else {
          $referenced_entities = $this->fieldValueManager->getReferencedEntities($items);
        }

        foreach ($referenced_entities as $child_entity) {
          $child_paragraph_node = $this->createElement($field_node->ownerDocument, 'widget', [
            '<uuid>' => $child_entity->uuid(),
          ]);
          $this->expandParagraph($data, $child_paragraph_node, $child_entity);
          $field_node->appendChild($child_paragraph_node);
        }
        $paragraph_node->appendChild($field_node);
      }
    }
  }

  /**
   * Compiles a paragraph into a collection of widget binder data for delivery.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current semantic data state.
   * @param \Drupal\paragraphs\ParagraphInterface $entity
   *   The paragraph entity to be compiled into widget binder data.
   * @param string $field_context_id
   *   The id of the editing context to which the entity belongs.
   */
  protected function compileParagraph(SemanticDataInterface $data, ParagraphInterface $entity, $field_context_id) {
    $context = $this->contextFactory->get($field_context_id);
    $item = $context->getEditBuffer()->createItem($entity);
    $view_mode = $data->get('settings.view_mode');
    $langcode = $data->get('langcode');
    $this->widgetData = $this->widgetData->merge($this->dataCompiler->compile($context, $item, $view_mode, $langcode));
    $this->count++;
  }

  /**
   * Decorates the final result with data necessary to display the editor.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current semantic data state.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface $result
   *   The current result object.
   *
   * @return \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface
   *   An updated result object decorated with the data needed to display the
   *   editor field widget.
   */
  protected function finishResult(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $field_value_wrapper = $data->get('field.wrapper');

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
      'filter_format' => $field_value_wrapper->getFormat(),
    ]);

    return $result;
  }

}
