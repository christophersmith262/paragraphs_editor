<?php

namespace Drupal\paragraphs_editor\Plugin\Field\FieldWidget;

use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorInterface;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'entity_reference_paragraphs_editor' widget.
 *
 * We hide add / remove buttons when translating to avoid accidental loss of
 * data because these actions effect all languages.
 *
 * @FieldWidget(
 *   id = "entity_reference_paragraphs_editor",
 *   label = @Translation("Paragraphs (Editor)"),
 *   multiple_values = TRUE,
 *   description = @Translation("Editor paragraphs form widget."),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class ParagraphsEditorWidget extends InlineParagraphsWidget implements ContainerFactoryPluginInterface {

  protected $contextFactory;
  protected $fieldValueManager;
  protected $bundleSelectorManager;
  protected $deliveryProviderManager;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, array $third_party_settings, FieldValueManagerInterface $field_value_manager, DomProcessorInterface $dom_processor, array $plugin_managers) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
    $this->fieldValueManager = $field_value_manager;
    $this->domProcessor = $dom_processor;
    $this->bundleSelectorManager = $plugin_managers['bundle_selector'];
    $this->deliveryProviderManager = $plugin_managers['delivery_provider'];
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
      $configuration['third_party_settings'],
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('dom_processor.dom_processor'),
      $container->getParameter('paragraphs_editor.plugin_managers')
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return array(
      'title' => t('Paragraph'),
      'bundle_selector' => 'list',
      'delivery_provider' => 'modal',
      'filter_format' => 'paragraphs_ckeditor',
    );
  }

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    $editable_data = $this->process('load', $items, $form_state);
    return [
      'markup' => $element + [
        '#type' => 'text_format',
        '#format' => $editable_data->get('filter_format'),
        '#default_value' => $editable_data->get('markup'),
        '#rows' => 100,
        '#atributes' => $editable_data->get('attributes'),
        '#attributes' => [
          'class' => [
            'paragraphs-editor'
          ],
          'data-context' => $editable_data->get('context_id'),
        ],
        '#attached' => [
          'library' => $editable_data->get('libraries'),
          'drupalSettings' => $editable_data->get('drupalSettings'),
        ],
      ],
      'context_id' => [
        '#type' => 'hidden',
        '#default_value' => $editable_data->get('context_id'),
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $elements = array();

    $elements['title'] = array(
      '#type' => 'textfield',
      '#title' => $this->t('Paragraph Title'),
      '#description' => $this->t('Label to appear as title on the button "Insert [title]. This label is translatable.'),
      '#default_value' => $this->getSetting('title'),
      '#required' => TRUE,
    );

    $options = array();
    foreach ($this->bundleSelectorManager->getDefinitions() as $plugin) {
      $options[$plugin['id']] = $plugin['title'];
    }

    $elements['bundle_selector'] = array(
      '#type' => 'select',
      '#title' => $this->t('Bundle Selection Handler'),
      '#description' => $this->t('The bundle selector form plugin that will be used to allow users to insert paragraph items.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('bundle_selector'),
      '#required' => TRUE,
    );

    $options = array();
    foreach ($this->deliveryProviderManager->getDefinitions() as $plugin) {
      $options[$plugin['id']] = $plugin['title'];
    }

    $elements['delivery_provider'] = array(
      '#type' => 'select',
      '#title' => $this->t('Delivery Handler'),
      '#description' => $this->t('The delivery plugin that controls the user experience for how forms are delivered.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('delivery_provider'),
      '#required' => TRUE,
    );

    $options = array();
    foreach (filter_formats() as $filter_format) {
      $options[$filter_format->id()] = $filter_format->label();
    }

    $elements['filter_format'] = array(
      '#type' => 'select',
      '#title' => 'Default Filter Format',
      '#description' => $this->t('The default filter format to use for the Editor instance.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('filter_format'),
      '#required' => TRUE,
    );

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $text_bundle = $this->getSetting('text_bundle');
    $bundle_selector = $this->bundleSelectorManager->getDefinition($this->getSetting('bundle_selector'));
    $delivery_provider = $this->deliveryProviderManager->getDefinition($this->getSetting('delivery_provider'));
    $summary = array();
    $summary[] = $this->t('Title: @title', array('@title' => $this->getSetting('title')));
    $summary[] = $this->t('Bundle Selector: @bundle_selector', array('@bundle_selector' => $bundle_selector['title']));
    $summary[] = $this->t('Delivery Provider: @delivery_provider', array('@delivery_provider' => $delivery_provider['title']));
    $summary[] = $this->t('Default Format: @filter_format', array('@filter_format' => $this->getSetting('filter_format')));
    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function extractFormValues(FieldItemListInterface $items, array $form, FormStateInterface $form_state) {
    $field_name = $this->fieldDefinition->getName();
    $path = array_merge($form['#parents'], [$field_name]);
    $values = NestedArray::getValue($form_state->getValues(), $path);
    $this->process('update', $items, $form_state, $values['markup']['format'], $values['markup']['value'], $values['context_id']);
  }

  /**
   * {@inheritdoc}
   */
  protected function process($variant, $items, FormStateInterface $form_state, $format = NULL, $markup = NULL, $context_id = NULL) {
    $field_value_wrapper = $this->fieldValueManager->wrapItems($items);

    if (!isset($markup)) {
      $markup = $field_value_wrapper->getMarkup();
    }

    if (!isset($format)) {
      $format = $field_value_wrapper->getFormat();
    }

    if (!$format) {
      $format = 'paragraphs_ckeditor';
    }

    // Check revisioning status.
    $entity = $form_state->getFormObject()->getEntity();
    $new_revision = FALSE;
    if ($entity instanceof RevisionableInterface) {
      if ($entity->isNewRevision()) {
        $new_revision = TRUE;
      }
      elseif ($entity->getEntityType()->hasKey('revision') && $form_state->getValue('revision')) {
        $new_revision = TRUE;
      }
    }

    return $this->domProcessor->process($markup, 'paragraphs_editor', $variant, [
      'field' => [
        'items' => $items,
        'context_id' => $context_id,
        'is_mutable' => TRUE,
        'wrapper' => $field_value_wrapper,
      ],
      'owner' => [
        'entity' => $entity,
        'new_revision' => $new_revision,
      ],
      'langcode' => $form_state->get('langcode'),
      'settings' => $this->getSettings(),
      'filter_format' => $format,
    ]);
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
