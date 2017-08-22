<?php

namespace Drupal\paragraphs_editor\Plugin\Field\FieldFormatter;

use Drupal\Core\Entity\EntityDisplayRepositoryInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
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

  /**
   * @var \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface*/
  protected $fieldValueManager;

  protected $entityDisplayRepository;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, $label, $view_mode, array $third_party_settings, FieldValueManagerInterface $field_value_manager, EntityDisplayRepositoryInterface $entity_display_repository, $dom_processor) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label, $view_mode, $third_party_settings);
    $this->fieldValueManager = $field_value_manager;
    $this->entityDisplayRepository = $entity_display_repository;
    $this->domProcessor = $dom_processor;
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
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('entity_display.repository'),
      $container->get('dom_processor.dom_processor')
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [
      'view_mode' => 'default',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];

    // Prepare the processor with data from the top level item being rendered
    // only. This is pushed onto the processing stack and consumed at the
    // composition root of the paragraph tree. Recursive rendering will all use
    // the settings from the composition root. Note that we cannot set the
    // 'field' key here since it will be used for all recursive rendering, which
    // would result in an infinite rendering loop.
    $field_value_wrapper = $this->fieldValueManager->wrapItems($items);
    if (!$this->domProcessor->prepared()) {
      $this->domProcessor->prepare([
        'field' => [
          'items' => $items,
          'wrapper' => $field_value_wrapper,
          'is_mutable' => TRUE,
        ],
        'settings' => $this->getSettings(),
      ]);
    }

    $elements[0] = [
      '#type' => 'processed_text',
      '#text' => $field_value_wrapper->getMarkup(),
      '#format' => $field_value_wrapper->getFormat(),
      '#langcode' => $langcode,
    ];

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $elements['view_mode'] = [
      '#type' => 'select',
      '#options' => $this->entityDisplayRepository->getViewModeOptions('paragraph'),
      '#title' => $this->t('View Mode'),
      '#description' => $this->t('The view mode that embedded entities will be rendered with.'),
      '#default_value' => $this->getSetting('view_mode'),
      '#required' => TRUE,
    ];

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = [];
    $summary[] = $this->t('Rendered as @mode', ['@mode' => $this->getSetting('view_mode')]);
    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    return \Drupal::service('paragraphs_editor.field_value.manager')->isParagraphsEditorField($field_definition);
  }

  /**
   * {@inheritdoc}
   */
  protected function mergeDefaults() {
    $this->settings += $this->fieldDefinition->getThirdPartySettings('paragraphs_editor');
    $this->settings += static::defaultSettings();
    $this->defaultSettingsMerged = TRUE;
  }

}
