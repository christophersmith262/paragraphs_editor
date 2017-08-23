<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\ParagraphsEditorElementTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A DOM processor plugin for extracting paragraph edits from a DOM tree.
 *
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_extractor",
 *   label = "Paragraphs Editor Extractor"
 * )
 */
class ParagraphsEditorExtractor implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * Creates a paragraph extractor plugin.
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
    $new_revision = $data->get('owner.new_revision');
    $langcode = $data->get('langcode');

    if ($data->is($this->getSelector('widget'))) {
      $entity = $data->get('paragraph.entity');

      $wrapper = $data->get('field.wrapper');
      if ($wrapper) {
        $wrapper->addReferencedEntity($entity);
      }
      else {
        $result = $result->merge([
          'entities' => [
            $entity->uuid() => $entity,
          ],
        ]);
      }

      if ($data->node()->hasChildNodes()) {
        foreach ($data->node()->childNodes as $child_node) {
          $data->node()->removeChild($child_node);
        }
      }

      $this->removeAttribute($data->node(), 'widget', '<context>');
    }
    elseif ($data->is($this->getSelector('field')) || $data->isRoot()) {
      $items = $data->get('field.items');
      $wrapper = $data->get('field.wrapper');

      if ($wrapper) {
        $wrapper->setMarkup($data->getInnerHTML());
        $wrapper->setFormat($data->get('filter_format'));
        $entities = $wrapper->getEntities();
      }
      else {
        $entities = $result->get('entities');
        if (!$entities) {
          $entities = [];
        }
      }
      $this->fieldValueManager->setItems($items, $entities, $new_revision, $langcode);

      $result = $result->clear('entities');
    }

    return $result;
  }

}
