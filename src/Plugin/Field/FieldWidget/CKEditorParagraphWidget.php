<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Field\FieldWidget;

use Drupal\Component\Utility\Crypt;
use Drupal\Component\Plugin\PluginManagerInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\WidgetBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Form\FormState;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'entity_reference paragraphs' widget.
 *
 * We hide add / remove buttons when translating to avoid accidental loss of
 * data because these actions effect all languages.
 *
 * @FieldWidget(
 *   id = "entity_reference_paragraphs_ckeditor",
 *   label = @Translation("Paragraphs (CKEditor)"),
 *   description = @Translation("CKEditor paragraphs form widget."),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class CKEditorParagraphsWidget extends InlineParagraphsWidget implements ContainerFactoryPluginInterface {

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
      'title_plural' => t('Paragraphs'),
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
    return parent::formElement($items, $delta, $element, $form, $form_state);
  }

  public function formMultipleElements(FieldItemListInterface $items, array &$form, FormStateInterface $form_state, $get_delta = NULL) {
    $elements = parent::formMultipleElements($items, $form, $form_state, $get_delta);

    // Load the widget state so we can set the widget build id, which associates
    // the widget instance with a collection of paragraph entities that are
    // referenced by the widget.
    $field_name = $this->fieldDefinition->getName();
    $parents = $form['#parents'];
    $widget_state = static::getWidgetState($parents, $field_name, $form_state);

    // Get the build id for this widget. For a new form this means generating a
    // new randomized build id. To do this we use the same method that is used
    // to generate form build ids in core. For a form that is being rebuilt, we
    // can simply read the existing build id from the widget state that is
    // derived from the form state. If we're creating a new build id, we'll also
    // want to store it in the widget state so we can refer back to it later.
    if (empty($widget_state['paragraphs_ckeditor']['widget_build_id'])) {
      $widget_build_id = Crypt::randomBytesBase64();
      $widget_state['paragraphs_ckeditor']['widget_build_id'] = $widget_build_id;
      static::setWidgetState($parents, $field_name, $form_state, $widget_state);
    }
    else {
      $widget_build_id = $widget_state['paragraphs_ckeditor']['widget_build_id'];
    }

    $context_string = $this->getContext($items->getEntity(), $widget_build_id)->getContextString();
    $elements['paragraphs_ckeditor'] = array(
      '#type' => 'text_format',
      '#format' => $this->getSetting('filter_format'),
      '#default_value' => $this->toMarkup($items, $context_string),
      '#attributes' => array(
        'class' => array(
          'paragraphs-ckeditor'
        ),
        'data-paragraphs-ckeditor-context' => $context_string,
      ),
      '#attached' => array(
        'library' => array(
          'paragraphs_ckeditor/widget',
        )
      ),
    );

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function form(FieldItemListInterface $items, array &$form, FormStateInterface $form_state, $get_delta = NULL) {
    // Create the widget form element.
    $element = parent::form($items, $form, $form_state, $get_delta);

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
      '#description' => $this->t('Label to appear as title on the button as "Add new [title]", this label is translatable'),
      '#default_value' => $this->getSetting('title'),
      '#required' => TRUE,
    );

    $elements['title_plural'] = array(
      '#type' => 'textfield',
      '#title' => $this->t('Plural Paragraph Title'),
      '#description' => $this->t('Title in its plural form.'),
      '#default_value' => $this->getSetting('title_plural'),
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
    $summary[] = $this->t('Plural title: @title_plural', array('@title_plural' => $this->getSetting('title_plural')));
    $summary[] = $this->t('Bundle Selector: @bundle_selector', array('@bundle_selector' => $bundle_selector['title']));
    $summary[] = $this->t('Delivery Provider: @delivery_provider', array('@delivery_provider' => $delivery_provider['title']));
    $summary[] = $this->t('Filter Format: @filter_format', array('@filter_format' => $this->getSetting('filter_format')));
    $summary[] = $this->t('Text Bundle: @text_bundle', array('@text_bundle' => $this->getSetting('text_bundle')));
    return $summary;
  }

  protected function getContext(EntityInterface $entity, $widget_build_id) {
    return $this->contextFactory->create($entity->getEntityType(), $entity->id, $this->fieldDefinition->id, $widget_build_id);
  }

  protected function toMarkup(FieldItemListInterface $items, $context_string) {
    $markup = '';
    foreach ($items as $item) {
      if ($item->entity->bundle() == $this->getSetting('text_bundle')) {
        $markup .= $this->createEmbedCode($item->entity, $context_string);
      }
      else {
      }
    }
    return $markup;
  }

  protected function createEmbedCode(ContentEntityInterface $entity, $context_string) {
    return '<paragraphs-ckeditor-paragraph ' .
      'data-paragraph-uuid="' . $entity->uuid() . '" ' .
      'data-context-hint="' . $context_string . '">' .
      '</paragraphs-ckeditor-paragraph>';
  }
}
