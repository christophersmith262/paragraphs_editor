<?php

namespace Drupal\paragraphs_ckeditor;

use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;

trait ParagraphsCKEditorAwarePluginTrait {

  protected function mergeDefaults() {
    $this->settings += $this->fieldDefinition->getThirdPartySettings('paragraphs_ckeditor');
    $this->settings += static::defaultSettings();
    $this->defaultSettingsMerged = TRUE;
  }

  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    // We only every allow this widget to be applied to fields that have
    // unlimited cardinality. Otherwise we'd have to deal with keeping track of
    // how many paragraphs are in the CKEditor instance.
    $cardinality = $field_definition->getFieldStorageDefinition()->getCardinality();
    if ($cardinality != FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED) {
      return FALSE;
    }

    // Make sure it is a pragraphs ckeditor enabled field.
    $settings = $field_definition->getThirdPartySettings('paragraphs_ckeditor');
    if (empty($settings['enabled'])) {
      return FALSE;
    }

    // Make sure the bundle for storing text is valid.
    $text_bundle = $field_definition->getThirdPartySetting('paragraphs_ckeditor', 'text_bundle');
    $text_field = $field_definition->getThirdPartySetting('paragraphs_ckeditor', 'text_field');
    $text_bundle_manager = \Drupal::service('paragraphs_ckeditor.field_value.text_bundle_manager');
    if (!$text_bundle_manager->validateTextBundle($text_bundle, $text_field)) {
      return FALSE;
    }

    return TRUE;
  }
}
