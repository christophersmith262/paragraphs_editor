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

  public function updateItems(FieldItemListInterface $items, FieldValueWrapperInterface $field_value_wrapper, $new_revision = FALSE, $langcode = NULL) {
    $values = array();
    $entities = array_merge([$field_value_wrapper->getTextEntity()], array_values($field_value_wrapper->getEntities()));
    foreach ($entities as $delta => $paragraphs_entity) {
      if (!is_object($paragraphs_entity)) {
        print_r($field_value_wrapper->getEntities());
        die();
      }
      $paragraphs_entity->setNewRevision($new_revision);

      if (isset($langcode) && $paragraphs_entity->get('langcode') != $langcode) {
        if ($paragraphs_entity->hasTranslation($langcode)) {
          $paragraphs_entity = $paragraphs_entity->getTranslation($langcode);
        }
        else {
          $paragraphs_entity->set('langcode', $langcode);
        }
      }
      $paragraphs_entity->setNeedsSave(TRUE);
      $values[$delta]['entity'] = $paragraphs_entity;
      $values[$delta]['target_id'] = $paragraphs_entity->id();
      $values[$delta]['target_revision_id'] = $paragraphs_entity->getRevisionId();
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
      $text_fields = $this->getTextFields();
      if (count($text_fields) == 1) {
        $bundles[$name] = reset($text_fields) + [
          'label' => $type['label'],
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
    /*$text_bundle_manager = \Drupal::service('paragraphs_editor.field_value.text_bundle_manager');
    if (!$text_bundle_manager->validateTextBundle($text_bundle, $text_field)) {
      return FALSE;
    }*/

    return TRUE;
  }

  protected function isTextField(FieldDefinitionInterface $field_config) {
    return $field_config->getType() == 'text_long';
  }

  protected function getTextFields($bundle_name) {
    $field_definitions = $this->entityFieldManager->getFieldDefinitions('paragraph', $bundle_name);
    foreach ($field_definitions as $field_definition) {
      if ($this->isTextField($field_definition)) {
        return $field_definition;
      }
    }
    return NULL;
  }
}
