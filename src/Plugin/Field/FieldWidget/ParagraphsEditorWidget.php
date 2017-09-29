<?php

namespace Drupal\paragraphs_editor\Plugin\Field\FieldWidget;

use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Entity\EntityDisplayRepositoryInterface;
use Drupal\Core\Entity\RevisionableInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorInterface;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'entity_reference_paragraphs_editor' widget.
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

  /**
   * The editor field value manager for wrapping items.
   *
   * @var \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface
   */
  protected $fieldValueManager;

  /**
   * The dom processor for preparing and extracting editor content.
   *
   * @var \Drupal\dom_processor\DomProcessor\DomProcessorInterface
   */
  protected $domProcessor;

  /**
   * The plugin manager for bundle selector plugins.
   *
   * @var \Drupal\Component\Plugin\PluginManagerInterface
   */
  protected $bundleSelectorManager;

  /**
   * The plugin manager for delivery plugins.
   *
   * @var \Drupal\Component\Plugin\PluginManagerInterface
   */
  protected $deliveryProviderManager;

  /**
   * The entity display repository service for getting view modes.
   *
   * @var \Drupal\Core\Entity\EntityDisplayRepositoryInterface
   */
  protected $entityDisplayRepository;

  /**
   * Creates a paragraphs editor field widget.
   *
   * @param string $plugin_id
   *   The field widget plugin id.
   * @param mixed $plugin_definition
   *   The plugin definition.
   * @param \Drupal\Core\Field\FieldDefinitionInterface $field_definition
   *   The paragraphs editor field definition.
   * @param array $settings
   *   The paragraphs editor field widget settings.
   * @param array $third_party_settings
   *   The third party settings for the widget.
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager for getting and setting paragraphs editor field
   *   information.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorInterface $dom_processor
   *   The DOM processor for reading and writing markup.
   * @param \Drupal\Core\Entity\EntityDisplayRepositoryInterface $entity_display_repository
   *   The view mode manager.
   * @param array $plugin_managers
   *   The paragraphs editor plugin managers.
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, array $third_party_settings, FieldValueManagerInterface $field_value_manager, DomProcessorInterface $dom_processor, EntityDisplayRepositoryInterface $entity_display_repository, array $plugin_managers) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
    $this->fieldValueManager = $field_value_manager;
    $this->domProcessor = $dom_processor;
    $this->entityDisplayRepository = $entity_display_repository;
    $this->bundleSelectorManager = $plugin_managers['bundle_selector'];
    $this->deliveryProviderManager = $plugin_managers['delivery_provider'];
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $plugin_managers = [];
    foreach ($container->getParameter('paragraphs_editor.plugin_managers') as $name => $def) {
      $plugin_managers[$name] = $container->get($def->id);
    }
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['field_definition'],
      $configuration['settings'],
      $configuration['third_party_settings'],
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('dom_processor.dom_processor'),
      $container->get('entity_display.repository'),
      $plugin_managers
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [
      'title' => t('Paragraph'),
      'bundle_selector' => 'list',
      'delivery_provider' => 'modal',
      'filter_format' => 'paragraphs_ckeditor',
      'view_mode' => 'default',
      'prerender_count' => '10',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    $editable_data = $this->process('load', $items, $form_state);

    // Pretty much all the important parts are generated by the DOM processor.
    // Offloading things like '#attached' and '#attributes' to the processor
    // allows it to do things like dynamically load javascript for rendered
    // entities.
    return [
      'markup' => $element + [
        '#type' => 'text_format',
        '#format' => $editable_data->get('filter_format'),
        '#default_value' => $editable_data->get('markup'),
        '#rows' => 100,
        '#attributes' => $editable_data->get('attributes'),
        '#attached' => [
          'library' => $editable_data->get('libraries'),
          'drupalSettings' => $editable_data->get('drupalSettings'),
        ],
        '#allowed_formats' => [$editable_data->get('filter_format')],
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
    $elements = [];

    $elements['title'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Paragraph Title'),
      '#description' => $this->t('Label to appear as title on the button "Insert [title]. This label is translatable.'),
      '#default_value' => $this->getSetting('title'),
      '#required' => TRUE,
    ];

    $options = [];
    foreach ($this->bundleSelectorManager->getDefinitions() as $plugin) {
      $options[$plugin['id']] = $plugin['title'];
    }

    $elements['bundle_selector'] = [
      '#type' => 'select',
      '#title' => $this->t('Bundle Selection Handler'),
      '#description' => $this->t('The bundle selector form plugin that will be used to allow users to insert paragraph items.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('bundle_selector'),
      '#required' => TRUE,
    ];

    $options = [];
    foreach ($this->deliveryProviderManager->getDefinitions() as $plugin) {
      $options[$plugin['id']] = $plugin['title'];
    }

    $elements['delivery_provider'] = [
      '#type' => 'select',
      '#title' => $this->t('Delivery Handler'),
      '#description' => $this->t('The delivery plugin that controls the user experience for how forms are delivered.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('delivery_provider'),
      '#required' => TRUE,
    ];

    $options = [];
    foreach (filter_formats() as $filter_format) {
      $options[$filter_format->id()] = $filter_format->label();
    }

    $elements['filter_format'] = [
      '#type' => 'select',
      '#title' => 'Default Filter Format',
      '#description' => $this->t('The default filter format to use for the Editor instance.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('filter_format'),
      '#required' => TRUE,
    ];

    $elements['view_mode'] = [
      '#type' => 'select',
      '#title' => 'Editor View Mode',
      '#description' => $this->t('The view mode that will be used to render embedded entities.'),
      '#options' => $this->entityDisplayRepository->getViewModeOptions('paragraph'),
      '#default_value' => $this->getSetting('prerender_count'),
      '#required' => TRUE,
    ];

    $options = [0 => $this->t('None')];
    for ($i = 5; $i <= 50; $i += 5) {
      $options[$i] = $i;
    }
    $options[-1] = $this->t('All');
    $elements['prerender_count'] = [
      '#type' => 'select',
      '#title' => 'Maximum Pre-Render Items',
      '#description' => $this->t("The maximum number of embedded paragraphs to render before an editor is initialized. Additional entities will be rendered via ajax on demand, and won't be available to edit until their respective ajax calls finish."),
      '#options' => $options,
      '#default_value' => $this->getSetting('prerender_count'),
      '#required' => TRUE,
    ];

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $bundle_selector = $this->bundleSelectorManager->getDefinition($this->getSetting('bundle_selector'));
    $delivery_provider = $this->deliveryProviderManager->getDefinition($this->getSetting('delivery_provider'));
    $prerender_count = $this->getSetting('prerender_count');
    if ($prerender_count == '-1') {
      $prerender_count = 'All';
    }
    elseif ($prerender_count == '0') {
      $prerender_count = 'None';
    }
    $summary = [];
    $summary[] = $this->t('Title: @title', ['@title' => $this->getSetting('title')]);
    $summary[] = $this->t('Bundle Selector: @bundle_selector', ['@bundle_selector' => $bundle_selector['title']]);
    $summary[] = $this->t('Delivery Provider: @delivery_provider', ['@delivery_provider' => $delivery_provider['title']]);
    $summary[] = $this->t('Default Format: @filter_format', ['@filter_format' => $this->getSetting('filter_format')]);
    $summary[] = $this->t('View Mode: @mode', ['@mode' => $this->getSetting('view_mode')]);
    $summary[] = $this->t('Maximum Pre-Render Items: @prerender_count', ['@prerender_count' => $prerender_count]);
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

  /**
   * Passes markup through the paragraphs_editor DOM processor.
   *
   * @param string $variant
   *   The DOM Processor plugin variant to run:
   *     - 'load' is used to take saved markup and make it editable.
   *     - 'update' is used to take editor markup and make it saveable.
   * @param \Drupal\Core\Field\FieldItemListInterface $items
   *   The field items that will receive savable entities, or serve loadable
   *   entities. Note that neither of these operations perform entity saves.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The form state for the form that the field widget belongs to.
   * @param string|null $format
   *   The default filter format name to apply to created text entities.
   * @param string|null $markup
   *   The markup to be processed. Defaults to the markup inside the text
   *   entity.
   * @param string|null $context_id
   *   The id of the root editing context to pull edits from.
   *
   * @see \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorPreparer
   * @see \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorDecorator
   * @see \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorExtractor
   *
   * @return \Drupal\dom_processor\DomProcessor\DomProcessorResultInterface
   *   See the ParagraphsEditorDecorator and ParagraphsEditorExtractor DOM
   *   Processor plugins for more information.
   */
  protected function process($variant, FieldItemListInterface $items, FormStateInterface $form_state, $format = NULL, $markup = NULL, $context_id = NULL) {
    $field_value_wrapper = $this->fieldValueManager->wrapItems($items);

    if (!isset($markup)) {
      $markup = $field_value_wrapper->getMarkup();
    }

    if (!isset($format)) {
      $format = $field_value_wrapper->getFormat();
    }

    if (!$format) {
      $format = $this->getSetting('text_format');
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

}
