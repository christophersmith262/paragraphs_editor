<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Field\FieldWidget;

use Drupal\Component\Utility\Crypt;
use Drupal\Component\Plugin\PluginManagerInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\Field\WidgetBase;
use Drupal\Core\Field\FieldFilteredMarkup;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Form\FormState;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'entity_reference_paragraphs_ckeditor' widget.
 *
 * We hide add / remove buttons when translating to avoid accidental loss of
 * data because these actions effect all languages.
 *
 * @FieldWidget(
 *   id = "entity_reference_paragraphs_ckeditor",
 *   label = @Translation("Paragraphs (CKEditor)"),
 *   multiple_values = TRUE,
 *   description = @Translation("CKEditor paragraphs form widget."),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class CKEditorParagraphWidget extends InlineParagraphsWidget implements ContainerFactoryPluginInterface {

  protected $contextFactory;
  protected $bundleSelectorManager;
  protected $deliveryProviderManager;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, array $third_party_settings, CommandContextFactoryInterface $context_factory, PluginManagerInterface $bundle_selector_manager, PluginManagerInterface $delivery_provider_manager) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
    $this->contextFactory = $context_factory;
    $this->bundleSelectorManager = $bundle_selector_manager;
    $this->deliveryProviderManager = $delivery_provider_manager;
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
      $container->get('paragraphs_ckeditor.command.context_factory'),
      $container->get('paragraphs_ckeditor.bundle_selector.manager'),
      $container->get('paragraphs_ckeditor.delivery_provider.manager')
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
      'text_bundle' => 'text',
    );
  }

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    // Load the widget state so we can set the widget context, which associates
    // the widget instance with a collection of paragraph entities that are
    // referenced by the widget.
    $field_name = $this->fieldDefinition->getName();
    $parents = $form['#parents'];
    $field_state = static::getWidgetState($parents, $field_name, $form_state);

    // Get the context for this widget. For a new form this means generating a
    // new randomized build id. To do this we use the same method that is used
    // to generate form build ids in core. For a form that is being rebuilt, we
    // can simply read the existing context from the widget state that is
    // derived from the form state. If we're creating a new build id, we'll also
    // want to store it in the widget state so we can refer back to it later.
    if (empty($field_state['paragraphs_ckeditor']['context_string'])) {
      $widget_build_id = Crypt::randomBytesBase64();
      $context_string = $this->getContext($items->getEntity(), $widget_build_id)->getContextString();
      $field_state['paragraphs_ckeditor']['context_string'] = $context_string;
      static::setWidgetState($parents, $field_name, $form_state, $field_state);
    }
    else {
      $context_string = $widget_state['paragraphs_ckeditor']['context_string'];
    }

    // If there is markup already saved for the field, we use that. Otherwise we
    // generate markup based on the paragraph items already in the field.
    $markup = $this->markupStorage->load($this->fieldDefinition, $this->getEntity());
    if (!$markup) {
      $decompiler = $this->getParagraphDecompiler();
      $markup = $decompiler->decompile($items);
    }

    // Create the CKEditor form element and decorate it with some attributes
    // that help us process it on the front end. Since its hard to get back
    // widget settings just based on a field config id, we add the widget
    // settings directly to the drupalSettings object. The paragraphs-ckeditor
    // class will be used to find all instances of the field widget on the front
    // end, and the data-paragraphs-ckeditor-context will be used to persist the
    // state of the editor across ajax requests.
    $element += array(
      '#type' => 'text_format',
      '#format' => $this->getSetting('filter_format'),
      '#default_value' => $markup,
      '#attributes' => array(
        'class' => array(
          'paragraphs-ckeditor'
        ),
        'data-paragraphs-ckeditor-context' => $context_string,
      ),
      '#attached' => array(
        'library' => array(
          'paragraphs_ckeditor/widget',
        ),
        'drupalSettings' => array(
          'paragraphs_ckeditor' => array(
            $context_string => $this->getSettings(),
          ),
        ),
      ),
    );

    return $element;
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

    $element['filter_format'] = array(
      '#type' => 'select',
      '#title' => 'Filter Format',
      '#description' => $this->t('The filter format to use for the CKEditor instance.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('filter_format'),
    );

    $options = array();
    foreach ($this->getAllowedTypes() as $name => $type) {
      $options[$name] = $type['label'];
    }

    $elements['text_bundle'] = array(
      '#type' => 'select',
      '#title' => $this->t('Text Bundle'),
      '#description' => $this->t('The bundle to treat as plaintext input.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('text_bundle'),
      '#required' => TRUE,
    );

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $bundle_selector = $this->bundleSelectorManager->getDefinition($this->getSetting('bundle_selector'));
    $delivery_provider = $this->deliveryProviderManager->getDefinition($this->getSetting('delivery_provider'));
    $summary = array();
    $summary[] = $this->t('Title: @title', array('@title' => $this->getSetting('title')));
    $summary[] = $this->t('Bundle Selector: @bundle_selector', array('@bundle_selector' => $bundle_selector['title']));
    $summary[] = $this->t('Delivery Provider: @delivery_provider', array('@delivery_provider' => $delivery_provider['title']));
    $summary[] = $this->t('Filter Format: @filter_format', array('@filter_format' => $this->getSetting('filter_format')));
    $summary[] = $this->t('Text Bundle: @text_bundle', array('@text_bundle' => $this->getSetting('text_bundle')));
    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    // We only every allow this widget to be applied to fields that have
    // unlimited cardinality. Otherwise we'd have to deal with keeping track of
    // how many paragraphs are in the CKEditor instance.
    $cardinality = $field_definition->getFieldStorageDefinition()->getCardinality();
    return ($cardinality == FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED);
  }

  protected function getContext(EntityInterface $entity, $widget_build_id) {
    return $this->contextFactory->create($entity->getEntityType()->id(), $entity->id(), $this->fieldDefinition->id(), $widget_build_id, $this->getSettings());
  }

  protected function getMarkupConverter(CommandContextInterface $command) {
    $embed_template = array(
      'tag' => 'paragraphs-ckeditor-paragraph',
      'close' => TRUE,
      'attributes' => array(
        'data-paragraph-uuid' => '[entity:uuid]',
        'data-context-hint' => '[context:string]',
      ),
    );

    return new ParagraphDomConverter($context, $embed_template);
  }
}
