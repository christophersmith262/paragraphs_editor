<?php

namespace Drupal\paragraphs_editor\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\paragraphs_editor\ParagraphsEditorAwarePluginTrait;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Implementation of the 'entity_reference_paragraphs_editor' formatter.
 *
 * @FieldFormatter(
 *   id = "entity_reference_paragraphs_editor",
 *   label = @Translation("Rendered Editor Markup"),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class ParagraphsEditorFormatter extends FormatterBase implements ContainerFactoryPluginInterface {
  use ParagraphsEditorAwarePluginTrait;

  protected $fieldValueManager;

  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, $label, $view_mode, array $third_party_settings, FieldValueManagerInterface $field_value_manager) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label, $view_mode, $third_party_settings);
    $this->fieldValueManager = $field_value_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['field_definition'],
      $configuration['settings'],
      $configuration['label'],
      $configuration['view_mode'],
      $configuration['third_party_settings'],
      $container->get('paragraphs_editor.field_value.manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = array();

    $field_value_wrapper = $this->fieldValueManager->wrap($items, $this->getSettings());
    $elements[0] = array(
      '#type' => 'processed_text',
      '#text' => $field_value_wrapper->getMarkup(),
      '#format' => $field_value_wrapper->getFormat(),
      '#langcode' => $langcode,
    );

    return $elements;
  }

}
