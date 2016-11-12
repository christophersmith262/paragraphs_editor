<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Field\FieldWidget;

use Drupal\Component\Plugin\PluginManagerInterface;
use Drupal\Component\Utility\Crypt;
use Drupal\Component\Utility\NestedArray;
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
use Drupal\paragraphs_ckeditor\EditorMarkup\FieldValueConverter;

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
  use ParagraphsCKEditorFieldPluginTrait;

  protected $contextFactory;
  protected $fieldValueManager;
  protected $textBundleManager;
  protected $bundleSelectorManager;
  protected $deliveryProviderManager;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, array $third_party_settings, CommandContextFactoryInterface $context_factory, FieldValueManager $field_value_manager) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
    $this->contextFactory = $context_factory;
    $this->fieldValueManager = $field_value_manager;
    $this->textBundleManager = $field_value_manager->getTextBundleManager();
    $this->bundleSelectorManager = $context_factory->getPluginManager('bundle_selector');
    $this->deliveryProviderManager = $context_factory->getPluginManager('delivery_provider');
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
      $container->get('paragraphs_ckeditor.field_value.manager')
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
    $text_bundle = $this->getSetting('text_bundle');
    $text_field = $this->getSetting('text_field');
    $filter_format = $this->getSetting('filter_format');
    $widget_build_id = Crypt::randomBytesBase64();
    $context_string = $this->getContext($items->getEntity(), $widget_build_id)->getContextString();
    $field_value_wrapper = $this->fieldValueManager->wrap($items, $this->getSettings());
    $element += array(
      '#type' => 'text_format',
      '#format' => $field_value_wrapper->getFormat(),
      '#default_value' => $field_value_wrapper->getMarkup(),
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

    return array(
      'markup' => $element,
      'build_id' => array(
        '#type' => 'hidden',
        '#default_value' => $widget_build_id,
      ),
    );
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
      '#description' => $this->t('The default filter format to use for the CKEditor instance.'),
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
    $this->pushItemState($items, $form, $form_state);
    return parent::extractFormValues($items, $form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function massageFormValues(array $values, array $form, FormStateInterface $form_state) {
    list($items, $context) = $this->popItemState($form, $form_state);
    $edit_buffer = $context->getEditBuffer();
    $markup = $values['markup'];
    $format = $values['format'];
    $field_value_wrapper = $this->fieldValueManager->wrap($items, $this->getSettings());
    $entities = $this->fieldValueManager->update($field_value_wrapper, $edit_buffer, $markup, $format)->toArray();
    $this->contextFactory->free($context);
    return $values;
  }

  protected function pushItemState(FieldItemListInterface $items, array $form, FormStateInterface $form_state) {
    $field_name = $this->fieldDefinition->getName();
    $path = array_merge($form['#parents'], [$field_name]);
    $values = NestedArray::getValue($form_state->getValues(), $path);
    $item_state = [$items, $this->getContext($items->getEntity(), $values['build_id'])];
    $form_state->setTemporaryValue(array_merge(['paragraphs_ckeditor'], $path), $item_state);
    return $path;
  }

  protected function popItemState(array $form, FormStateInterface $form_state) {
    $field_name = $this->fieldDefinition->getName();
    $path = array_merge(['paragraphs_ckeditor'], $form['#parents'], [$field_name]);
    $value = $form_state->getTemporaryValue($path);
    $form_state->setTemporaryValue($path, NULL);
    return $value;
  }

  protected function getContext(EntityInterface $entity, $widget_build_id) {
    return $this->contextFactory->create($entity->getEntityType()->id(), $entity->id(), $this->fieldDefinition->id(), $widget_build_id, $this->getSettings());
  }
}
