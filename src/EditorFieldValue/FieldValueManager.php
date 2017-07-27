<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FieldableEntityInterface;

class FieldValueManager implements FieldValueManagerInterface {

  protected $bundleStorage;
  protected $entityFieldManager;
  protected $storage;

  public function __construct(EntityFieldManagerInterface $entity_field_manager, EntityTypeManagerInterface $entity_type_manager) {
    $this->entityFieldManager = $entity_field_manager;
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->bundleStorage = $entity_type_manager->getStorage('paragraphs_type');
  }

  public function wrapItems(FieldItemListInterface $items) {
    $field_definition = $items->getFieldDefinition();
    $settings = $field_definition->getThirdPartySettings('paragraphs_editor');
    $markup = '';
    $entities = array();

    // Build a list of refrenced entities and filter out the text entities.
    $text_entity = NULL;
    foreach ($items as $item) {
      $paragraph = $item->entity;
      if ($paragraph->bundle() == $settings['text_bundle']) {
        $markup .= $paragraph->{$settings['text_field']}->value;
        if (!$text_entity) {
          $text_entity = $paragraph;
        }
      }
      else {
        $entities[$paragraph->uuid()] = $paragraph;
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

    return new FieldValueWrapper($items->getFieldDefinition(), $text_entity, $entities);
  }

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
  }

  public function updateItems(FieldItemListInterface $items, array $entities, $new_revision = FALSE, $langcode = NULL) {
    $values = array();
    $delta = 0;
    foreach ($entities as $entity) {
      $this->prepareEntityForSave($entity, $new_revision, $langcode);
      $values[$delta]['entity'] = $entity;
      $values[$delta]['target_id'] = $entity->id();
      $values[$delta]['target_revision_id'] = $entity->getRevisionId();
      $delta++;
    }

    $items->setValue($values);
    $items->filterEmptyItems();
    return $items;
  }

  public function getTextBundles(array $allowed_bundles = []) {

    if (!$allowed_bundles) {
      foreach ($this->bundleStorage->getQuery()->execute() as $name) {
        $allowed_bundles[$name] = array(
          'label' => $this->bundleStorage->load($name)->label(),
        );
      }
    }

    $bundles = array();
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

  public function validateTextBundle($bundle_name, $field_name) {
    return TRUE;
  }

  public function isParagraphsField(FieldDefinitionInterface $field_definition) {
    if ($field_definition->getType() != 'entity_reference_revisions') {
      return FALSE;
    }

    return TRUE;
  }

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
    if (!$this->validateTextBundle($text_bundle, $text_field)) {
      return FALSE;
    }

    return TRUE;
  }

  protected function isTextField(FieldDefinitionInterface $field_config) {
    return $field_config->getType() == 'text_long';
  }

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
}
