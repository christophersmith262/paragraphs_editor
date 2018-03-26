<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;
use Drupal\paragraphs_editor\ParagraphsEditorElements;
use Drupal\paragraphs_editor\ParagraphsEditorElementTrait;
use Drupal\paragraphs_editor\Utility\TypeUtility;
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
   * @param \Drupal\paragraphs_editor\ParagraphsEditorElements $elements
   *   The elements service to initialize the element trait.
   */
  public function __construct(ParagraphsEditorElements $elements) {
    $this->initializeParagraphsEditorElementTrait($elements);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.elements')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($data->is($this->getSelector('widget'))) {
      return $this->processWidget($data, $result);
    }
    elseif ($data->is($this->getSelector('field')) || $data->isRoot()) {
      return $this->processField($data, $result);
    }
    else {
      return $result;
    }
  }

  /**
   * Extracts entities from a widget.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current widget data to process.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface $result
   *   The current result.
   *
   * @return \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface
   *   The processed result.
   */
  protected function processWidget(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $entity = $data->get('paragraph.entity');
    $data->get('field.updates')[$entity->uuid()] = $entity;

    foreach ($data->node()->childNodes as $child_node) {
      $data->node()->removeChild($child_node);
    }

    $this->removeAttribute($data->node(), 'widget', '<context>');

    return $result;
  }

  /**
   * Updates field items based on the current processor state.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current field data to process.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface $result
   *   The current result.
   *
   * @return \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface
   *   The processed result.
   */
  protected function processField(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    $items = $data->get('field.items');
    $new_revision = $data->get('owner.new_revision');
    $langcode = $data->get('langcode');

    if (TypeUtility::isParagraphsEditorField($items->getFieldDefinition())) {
      $items->entity->setMarkup($data->getInnerHTML());
      $items->entity->setFormat($data->get('filter_format'));
      $this->prepareEntityForSave($items->entity, $new_revision, $langcode);
      $paragraph_items = $items->entity->paragraphs;
    }
    else {
      $paragraph_items = $items;
    }

    $updates = array_reverse((array) $data->get('field.updates'));
    $this->setItems($paragraph_items, $updates, $new_revision, $langcode);

    return $result;
  }

  /**
   * Helper function for preparing a composite entity to be saved.
   *
   * @param mixed $entity
   *   The entity to prepare for saving.
   * @param bool $new_revision
   *   Set to true to create a new revision when the items are saved.
   * @param string|null $langcode
   *   Overrides the language the paragraph will be saved in.
   */
  protected function prepareEntityForSave($entity, $new_revision = FALSE, $langcode = NULL) {
    $entity->setNewRevision($new_revision);

    if (isset($langcode) && $entity->get('langcode') != $langcode) {
      if ($entity->hasTranslation($langcode)) {
        $entity = $entity->getTranslation($langcode);
      }
      else {
        $entity->set('langcode', $langcode);
      }
    }

    $entity->setNeedsSave(TRUE);

    return $entity;
  }

  /**
   * Sets the referenced entities on a paragraphs field.
   *
   * @param \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList $items
   *   The field items to be updated.
   * @param array $entities
   *   The entity values to set on the field items.
   * @param bool $new_revision
   *   Set to true to create a new revision when the items are saved.
   * @param string|null $langcode
   *   Overrides the language the paragraph will be saved in.
   *
   * @return \Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList
   *   The updated items object.
   */
  protected function setItems(EntityReferenceRevisionsFieldItemList $items, array $entities, $new_revision = FALSE, $langcode = NULL) {
    $values = [];
    $delta = 0;
    foreach ($entities as $entity) {
      $entity = $this->prepareEntityForSave($entity, $new_revision, $langcode);
      $values[$delta]['entity'] = $entity;
      $values[$delta]['target_id'] = $entity->id();
      $values[$delta]['target_revision_id'] = $entity->getRevisionId();
      $delta++;
    }

    $items->setValue($values);
    $items->filterEmptyItems();
    return $items;
  }

}
