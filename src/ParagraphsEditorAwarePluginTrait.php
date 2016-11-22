<?php

namespace Drupal\paragraphs_editor;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;

trait ParagraphsEditorAwarePluginTrait {

  protected function mergeDefaults() {
    $this->settings += $this->fieldDefinition->getThirdPartySettings('paragraphs_editor');
    $this->settings += static::defaultSettings();
    $this->defaultSettingsMerged = TRUE;
  }

  public static function isApplicable(FieldDefinitionInterface $field_definition) {
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
    $text_bundle_manager = \Drupal::service('paragraphs_editor.field_value.text_bundle_manager');
    if (!$text_bundle_manager->validateTextBundle($text_bundle, $text_field)) {
      return FALSE;
    }

    return TRUE;
  }
}
