<?php

namespace Drupal\paragraphs_editor\Plugin\Field\FieldWidget;

use Drupal\Component\Utility\Crypt;
use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;
use Drupal\paragraphs_editor\ParagraphsEditorAwarePluginTrait;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
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
  use ParagraphsEditorAwarePluginTrait;

  protected $contextFactory;
  protected $fieldValueManager;
  protected $bundleSelectorManager;
  protected $deliveryProviderManager;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, array $third_party_settings, CommandContextFactoryInterface $context_factory, FieldValueManagerInterface $field_value_manager) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
    $this->contextFactory = $context_factory;
    $this->fieldValueManager = $field_value_manager;
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
      $container->get('paragraphs_editor.command.context_factory'),
      $container->get('paragraphs_editor.field_value.manager')
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
    $context = $this->getContext($items->getEntity());
    $context_string = $context->getContextString();
    $field_value_wrapper = $this->fieldValueManager->wrap($items, $this->getSettings());

    return array(
      'markup' => $element + array(
        '#type' => 'text_format',
        '#format' => $field_value_wrapper->getFormat(),
        '#default_value' => $field_value_wrapper->getMarkup(),
        '#rows' => 100,
        '#attributes' => array(
          'class' => array(
            'paragraphs-editor'
          ),
          'data-context' => $context_string,
        ),
        '#attached' => array(
          'library' => array(
            'paragraphs_editor/core',
          ),
          'drupalSettings' => array(
            'paragraphs_editor' => array(
              'schema' => array(
                $this->fieldDefinition->id() => array(
                  'id' => $this->fieldDefinition->id(),
                  'allowed' => array(
                    'paragraphs_editor_text' => TRUE,
                    'tabs' => TRUE,
                  ),
                ),
              ),
              'context' => array(
                $context_string => array(
                  'id' => $context_string,
                  'schemaId' => $this->fieldDefinition->id(),
                  'settings' => $this->getSettings(),
                  'bufferItems' => array(
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      'build_id' => array(
        '#type' => 'hidden',
        '#default_value' => $context->getBuildId(),
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
      '#description' => $this->t('The default filter format to use for the Editor instance.'),
      '#options' => $options,
      '#default_value' => $this->getSetting('filter_format'),
      '#required' => TRUE,
    );

    return $elements;
  }

  public static function afterBuild(array $element, FormStateInterface $form_state) {
    return parent::afterBuild($element, $form_state);
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
    $this->setExtractionContext($items, $form, $form_state);
    $values = parent::extractFormValues($items, $form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function massageFormValues(array $values, array $form, FormStateInterface $form_state) {
    // Get the editor context from the form state.
    list($items, $context) = $this->getExtractionContext($form, $form_state);

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

    // Generate a flat entity list from the editor input.
    $edit_buffer = $context->getEditBuffer();
    $markup = $values['markup']['value'];
    $format = $values['markup']['format'];
    $field_value_wrapper = $this->fieldValueManager->wrap($items, $this->getSettings());
    $entities = $this->fieldValueManager->update($field_value_wrapper, $edit_buffer, $markup, $format)->toArray();

    // Do the "massaging" so that the returned values array is in the right
    // format.
    $values = array();
    foreach ($entities as $delta => $paragraphs_entity) {
      $paragraphs_entity->setNewRevision($new_revision);
      if ($paragraphs_entity->get('langcode') != $form_state->get('langcode')) {
        if ($paragraphs_entity->hasTranslation($form_state->get('langcode'))) {
          $paragraphs_entity = $paragraphs_entity->getTranslation($form_state->get('langcode'));
        }
        else {
          $paragraphs_entity->set('langcode', $form_state->get('langcode'));
        }
      }
      $paragraphs_entity->setNeedsSave(TRUE);
      $values[$delta]['entity'] = $paragraphs_entity;
      $values[$delta]['target_id'] = $paragraphs_entity->id();
      $values[$delta]['target_revision_id'] = $paragraphs_entity->getRevisionId();
    }

    // We no longer need to persist the context in the database. If the form
    // needs to be rebuilt at this point, it will be rebuilt based on the
    // updated entity that is in the process of being built, and we can
    // generate a new context object if need be.
    $this->contextFactory->free($context);

    return $values;
  }

  protected function setExtractionContext(FieldItemListInterface $items, array $form, FormStateInterface $form_state) {
    $field_name = $this->fieldDefinition->getName();
    $path = array_merge($form['#parents'], [$field_name]);
    $values = NestedArray::getValue($form_state->getValues(), $path);
    $item_state = [$items, $this->getContext($items->getEntity(), $values['build_id'])];
    $form_state->setTemporaryValue(array_merge(['paragraphs_editor'], $path), $item_state);
    return $path;
  }

  protected function getExtractionContext(array $form, FormStateInterface $form_state) {
    $field_name = $this->fieldDefinition->getName();
    $path = array_merge(['paragraphs_editor'], $form['#parents'], [$field_name]);
    return $form_state->getTemporaryValue($path);
  }

  protected function getContext(EntityInterface $entity, $widget_build_id=NULL) {
    return $this->contextFactory->create($this->fieldDefinition->id(), $entity->id(), $this->getSettings(), $widget_build_id);
  }
}
