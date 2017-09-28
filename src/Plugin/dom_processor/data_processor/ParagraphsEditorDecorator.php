<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\ParagraphsEditorElementTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A DOM processor plugin for decorating widgets with a context hint.
 *
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_decorator",
 *   label = "Paragraphs Editor Decorator"
 * )
 */
class ParagraphsEditorDecorator implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * Creates a widget decorator plugin.
   *
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service to initialize the element trait.
   */
  public function __construct(FieldValueManagerInterface $field_value_manager) {
    $this->initializeParagraphsEditorElementTrait($field_value_manager);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($data->is($this->getSelector('widget'))) {
      $this->setAttribute($data->node(), 'widget', '<context>', $data->get('context_id'));
    }
    return $result;
  }

}
