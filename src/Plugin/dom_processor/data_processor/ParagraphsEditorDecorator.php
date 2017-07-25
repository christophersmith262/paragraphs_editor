<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\paragraphs_editor\EditorCommand\WidgetBinderData;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_decorator",
 *   label = "Paragraphs Editor Decorator"
 * )
 */
class ParagraphsEditorDecorator implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  protected $contextFactory;
  protected $ownerInfo = NULL;

  public function __construct($field_value_manager, array $elements, $context_factory) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements'),
      $container->get('paragraphs_editor.command.context_factory')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if (!$this->ownerInfo) {
      $this->ownerInfo = $this->generateOwnerInfo($data, $result);
    }

    if ($this->is($data, 'widget')) {
      return $this->expandWidget($data, $result);
    }
    else if ($data->isRoot()) {
      return $this->finishResult($result);
    }
    else {
      return $result;
    }
  }

  protected function generateOwnerInfo(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $result = $result::create();

    $field_value_wrapper = $data->get('field.wrapper');
    if ($field_value_wrapper) {

      // Apply the default format if none is already provided.
      $filter_format = $field_value_wrapper->getFormat();
      if (!$filter_format) {
        $result = $result->merge([
          'filter_format' => $data->get('settings.filter_format')
        ]);
      }

      // Create a new editing context for the field.
      $field_definition = $data->get('field.items')->getFieldDefinition();
      $owner_entity = $data->get('owner.entity');
      if ($field_definition && $owner_entity) {
        $settings = $data->get('settings');
        $context = $this->contextFactory->create($field_definition->id(), $owner_entity->id(), $settings);
        $result = $result->merge([
          'context_id' => $context->getContextString(),
        ]);

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
        $result = $result->merge([
          'drupalSettings' => [
            'paragraphs_editor' => $widget_data->toArray(),
          ],
        ]);
      }
    }

    return $result;
  }

  public function expandWidget(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $paragraph = $data->get('paragraph.entity');
    $context_id = $data->get('paragraph.context_id');
    if ($paragraph && !$context_id) {
    }
    else {
      return $result;
    }
  }

  protected function finishResult(DomProcessorResultInterface $result) {
    $result = $result->merge($this->ownerInfo);

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
        $this->getAttributeName('widget', '<context>') => $result->get('context_id'),
      ],
    ]);

    return $result;
  }
}
