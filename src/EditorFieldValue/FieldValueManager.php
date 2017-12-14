<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\Utility\TypeUtility;

/**
 * Manages the paragraphs editor field values.
 */
class FieldValueManager implements FieldValueManagerInterface {

  /**
   * The storage plugin for the paragraph entity type.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $storage;

  /**
   * The storage plugin for the paragraph type config entity type.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $bundleStorage;

  /**
   * The field value manager service for collecting field information.
   *
   * @var \Drupal\Core\Entity\EntityFieldManagerInterface
   */
  protected $entityFieldManager;

  /**
   * Element definitions for custom elements that can occur in an editor field.
   *
   * @var array
   */
  protected $elements;

  /**
   * A static cache of paragraph revisions.
   *
   * @var \Drupal\paragraphs\ParagraphInterface[]
   */
  protected $revisionCache = [];

  /**
   * Creates a field value manager object.
   *
   * @param \Drupal\Core\Entity\EntityFieldManagerInterface $entity_field_manager
   *   The field manager service.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   * @param array $elements
   *   An array of widget binder element definitions.
   */
  public function __construct(EntityFieldManagerInterface $entity_field_manager, EntityTypeManagerInterface $entity_type_manager, array $elements) {
    $this->entityFieldManager = $entity_field_manager;
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->bundleStorage = $entity_type_manager->getStorage('paragraphs_type');
    $this->elements = $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function getReferencedEntities(EntityReferenceRevisionsFieldItemList $items) {
    $entities = [];
    foreach ($items as $item) {
      $value = $item->getValue();
      if (!empty($value['entity']) && $value['entity'] instanceof ParagraphInterface) {
        $entities[] = $item->entity;
      }
      elseif ($item->target_revision_id !== NULL) {
        if (!empty($this->revisionCache[$item->target_revision_id])) {
          $entities[] = $this->revisionCache[$item->target_revision_id];
        }
        else {
          $entity = $this->storage->loadRevision($item->target_revision_id);
          $entity = TypeUtility::ensureParagraph($entity);
          $this->revisionCache[$item->target_revision_id] = $entity;
          $entities[] = $entity;
        }
      }
    }
    return $entities;
  }

  /**
   * {@inheritdoc}
   */
  public function wrapItems(EntityReferenceRevisionsFieldItemList $items) {
    $field_definition = TypeUtility::ensureFieldConfig($items->getFieldDefinition());
    if (!$this->isParagraphsEditorField($field_definition)) {
      throw new \Exception('Attempt to wrap non-paragraphs editor field.');
    }

    // Build a list of refrenced entities and filter out the text entities.
    $settings = $field_definition->getThirdPartySettings('paragraphs_editor');
    $markup = '';
    $entities = [];
    $text_entity = NULL;

    foreach ($this->getReferencedEntities($items) as $entity) {
      if ($entity->bundle() == $settings['text_bundle']) {
        $markup .= $entity->{$settings['text_field']}->value;
        if (!$text_entity) {
          $text_entity = $entity;
        }
      }
      else {
        $entities[$entity->uuid()] = $entity;
      }
    }

    // If there is no text entity we need to create one.
    if (!$text_entity) {
      $text_entity = TypeUtility::ensureParagraph($this->storage->create([
        'type' => $settings['text_bundle'],
      ]));
    }

    // Reset the text entity markup in case we merged multiple text entities.
    $text_entity->{$settings['text_field']}->value = $markup;
    if (empty($text_entity->{$settings['text_field']}->format) && !empty($settings['filter_format'])) {
      $text_entity->{$settings['text_field']}->format = $settings['filter_format'];
    }

    return new FieldValueWrapper($field_definition, $text_entity, $entities);
  }

  /**
   * {@inheritdoc}
   */
  public function prepareEntityForSave($entity, $new_revision, $langcode) {
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
   * {@inheritdoc}
   */
  public function setItems(EntityReferenceRevisionsFieldItemList $items, array $entities, $new_revision = FALSE, $langcode = NULL) {
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

  /**
   * {@inheritdoc}
   */
  public function getTextBundles(array $allowed_bundles = []) {

    if (!empty($allowed_bundles)) {
      $results = $this->bundleStorage->getQuery()->execute();
      if (is_array($results)) {
        foreach ($results as $name) {
          $allowed_bundles[$name] = [
            'label' => $this->bundleStorage->load($name)->label(),
          ];
        }
      }
    }

    $bundles = [];
    foreach ($allowed_bundles as $name => $type) {
      $text_fields = $this->getTextFields($name);
      if (count($text_fields) == 1) {
        $bundles[$name] = [
          'label' => $type['label'],
          'text_field' => reset($text_fields),
        ];
      }
    }
    return $bundles;
  }

  /**
   * {@inheritdoc}
   */
  public function isParagraphsField(FieldDefinitionInterface $field_definition) {
    if ($field_definition->getType() != 'entity_reference_revisions') {
      return FALSE;
    }
    $field_definition = TypeUtility::ensureFieldConfig($field_definition);

    $target_type = $field_definition->getFieldStorageDefinition()->getSetting('target_type');
    return $target_type == 'paragraph';
  }

  /**
   * {@inheritdoc}
   */
  public function isParagraphsEditorField(FieldDefinitionInterface $field_definition) {
    if (!$this->isParagraphsField($field_definition)) {
      return FALSE;
    }
    $field_definition = TypeUtility::ensureFieldConfig($field_definition);

    // We only every allow this widget to be applied to fields that have
    // unlimited cardinality. Otherwise we'd have to deal with keeping track of
    // how many paragraphs are in the Editor instance.
    $cardinality = $field_definition->getFieldStorageDefinition()->getCardinality();
    if ($cardinality != FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED) {
      return FALSE;
    }

    // Make sure it is a pragraphs editor enabled field.
    $settings = $field_definition->getThirdPartySettings('paragraphs_editor');
    return !empty($settings['enabled']);
  }

  /**
   * {@inheritdoc}
   */
  public function getTextFields($bundle_name) {
    $matches = [];
    $field_definitions = $this->entityFieldManager->getFieldDefinitions('paragraph', $bundle_name);
    foreach ($field_definitions as $field_definition) {
      if ($this->isTextField($field_definition)) {
        $matches[] = $field_definition->getName();
      }
    }
    return $matches;
  }

  /**
   * {@inheritdoc}
   */
  public function getElement($element_name) {
    return isset($this->elements[$element_name]) ? $this->elements[$element_name] : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function getAttributeName($element_name, $attribute_name) {
    $element = $this->getElement($element_name);
    if (!empty($element['attributes'])) {
      $map = array_flip($element['attributes']);
      $key = !empty($map[$attribute_name]) ? $map[$attribute_name] : NULL;
      return $key;
    }
    else {
      return NULL;
    }
  }

  /**
   * {@inheritdoc}
   */
  public function getSelector($element_name) {
    $element = $this->getElement($element_name);
    $selector = !empty($element['tag']) ? $element['tag'] : '';
    if (!empty($element['attributes']['class'])) {
      $classes = explode(' ', $element['attributes']['class']);
      $selector .= '.' . implode('.', $classes);
    }
    return $selector;
  }

  /**
   * Helper function to check if a field is a text field.
   *
   * @param \Drupal\Core\Field\FieldDefinitionInterface $field_definition
   *   The field to check.
   *
   * @return bool
   *   TRUE if it's a paragraphs editor approved text field, FALSE otherwise.
   */
  protected function isTextField(FieldDefinitionInterface $field_definition) {
    return $field_definition->getType() == 'text_long';
  }

}
