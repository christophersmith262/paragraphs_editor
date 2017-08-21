<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;

/**
 *
 */
class FieldValueManager implements FieldValueManagerInterface {

  protected $bundleStorage;
  protected $entityFieldManager;
  protected $storage;
  protected $revisionCache = [];
  protected $elements;

  /**
   *
   */
  public function __construct(EntityFieldManagerInterface $entity_field_manager, EntityTypeManagerInterface $entity_type_manager, array $elements) {
    $this->entityFieldManager = $entity_field_manager;
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->bundleStorage = $entity_type_manager->getStorage('paragraphs_type');
    $this->elements = $elements;
  }

  /**
   *
   */
  public function updateCache(array $revision_cache) {
    $this->revisionCache += $revision_cache;
  }

  /**
   *
   */
  public function getReferencedEntities(FieldItemListInterface $items) {
    $entities = [];
    foreach ($items as $item) {
      $value = $item->getValue();
      if (!empty($value['entity']) && $value['entity'] instanceof EntityInterface) {
        $entity = $item->entity;
      }
      elseif ($item->target_revision_id !== NULL) {
        if (!empty($this->revisionCache[$item->target_revision_id])) {
          $entity = $this->revisionCache[$item->target_revision_id];
        }
        else {
          $entity = $this->storage->loadRevision($item->target_revision_id);
          $this->revisionCache[$item->target_revision_id] = $entity;
        }
      }
      $entities[] = $entity;
    }
    return $entities;
  }

  /**
   *
   */
  public function wrapItems(FieldItemListInterface $items) {
    $field_definition = $items->getFieldDefinition();
    $settings = $field_definition->getThirdPartySettings('paragraphs_editor');
    $markup = '';
    $entities = [];

    // Build a list of refrenced entities and filter out the text entities.
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
      $text_entity = $this->storage->create([
        'type' => $settings['text_bundle'],
      ]);
    }

    // Reset the text entity markup in case we merged multiple text entities.
    $text_entity->{$settings['text_field']}->value = $markup;
    if (empty($text_entity->{$settings['text_field']}->format) && !empty($settings['filter_format'])) {
      $text_entity->{$settings['text_field']}->format = $settings['filter_format'];
    }

    return new FieldValueWrapper($items->getFieldDefinition(), $text_entity, $entities);
  }

  /**
   *
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
   *
   */
  public function updateItems(FieldItemListInterface $items, array $entities, $new_revision = FALSE, $langcode = NULL) {
    $updated = [];
    foreach ($this->getReferencedEntities($items) as $entity) {
      $updated[$entity->uuid()] = $entity;
    }
    foreach ($entities as $entity) {
      $updated[$entity->uuid()] = $entity;
    }
    return $this->setItems($items, $updated, $new_revision, $langcode);
  }

  /**
   *
   */
  public function setItems(FieldItemListInterface $items, array $entities, $new_revision = FALSE, $langcode = NULL) {
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
   *
   */
  public function getTextBundles(array $allowed_bundles = []) {

    if (!$allowed_bundles) {
      foreach ($this->bundleStorage->getQuery()->execute() as $name) {
        $allowed_bundles[$name] = [
          'label' => $this->bundleStorage->load($name)->label(),
        ];
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
   *
   */
  public function isParagraphsField(FieldDefinitionInterface $field_definition) {
    if ($field_definition->getType() != 'entity_reference_revisions') {
      return FALSE;
    }

    return TRUE;
  }

  /**
   *
   */
  public function isParagraphsEditorField(FieldDefinitionInterface $field_definition) {
    if (!static::isParagraphsField($field_definition)) {
      return FALSE;
    }

    // We only every allow this widget to be applied to fields that have
    // unlimited cardinality. Otherwise we'd have to deal with keeping track of
    // how many paragraphs are in the Editor instance.
    $cardinality = $field_definition->getFieldStorageDefinition()->getCardinality();
    if ($cardinality != FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED) {
      return FALSE;
    }

    // Make sure it is a pragraphs editor enabled field.
    $settings = $field_definition->getThirdPartySettings('paragraphs_editor');
    if (empty($settings['enabled'])) {
      return FALSE;
    }

    // Make sure the bundle for storing text is valid.
    $text_bundle = $field_definition->getThirdPartySetting('paragraphs_editor', 'text_bundle');
    $text_field = $field_definition->getThirdPartySetting('paragraphs_editor', 'text_field');

    return TRUE;
  }

  /**
   *
   */
  protected function isTextField(FieldDefinitionInterface $field_config) {
    return $field_config->getType() == 'text_long';
  }

  /**
   *
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
   *
   */
  public function getElement($element_name) {
    return isset($this->elements[$element_name]) ? $this->elements[$element_name] : NULL;
  }

  /**
   *
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
   *
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

}
