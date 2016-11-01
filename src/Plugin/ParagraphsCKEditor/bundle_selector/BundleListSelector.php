<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\bundle_selector;

use Drupal\Core\Entity\EntityListBuilder;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_ckeditor\ParagraphCommand\BundleSelector\BundleSelectorInterface;

/**
 * Provides a simple listing of bundles to choose from.
 *
 * @ParagraphsCKEditorBundleSelector(
 *   id = "list",
 *   title = @Translation("List"),
 *   description = @Translation("Provides a basic list of bundles."),
 * )
 */
class BundleSelectionList extends EntityListBuilder implements BundleSelectorInterface, ContainerFactoryPluginInterface {

  protected $pluginId;
  protected $pluginDefinition;
  protected $context;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, CommandContextInterface $context, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct($entity_type_manager->getDefinition('paragraphs_type'), $entity_type_manager->getStorage('paragraphs_type'));
    $this->pluginId = $plugin_id;
    $this->pluginDefinition = $plugin_definition;
    $this->context = $context;
  }

  /**
   * {@inheritdoc}
   */
  public function createInstance(ContainerInterface $container, $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['context'],
      $container->get('entity_type.manager')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'paragraphs_ckeditor_bundle_list_builder';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $form['options'] = array(
      '#type' => 'table',
      '#header' => $this->buildHeader(),
      '#empty' => t('There is no @label yet.', array('@label' => $this->entityType->getLabel())),
    );

    $this->entities = $this->load();
    foreach ($this->entities as $entity) {
      $row = $this->buildRow($entity);
      if (isset($row['label'])) {
        $row['label'] = array('#markup' => $row['label']);
      }
      $form['options'][$entity->id()] = $row;
    }

    $form['actions']['cancel'] = array(
      '#type' => 'link',
      '#title' => $this->t('Cancel'),
      '#url' => \Drupal\Core\Url::fromRoute('paragraphs_ckeditor.command.cancel', array(
        'context' => $this->context->getContextString(),
      )),
      '#attributes' => array(
        'class' => array(
          'button',
          'use-ajax',
        ),
      ),
    );

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function buildHeader() {
    $header['label'] = t('Type');
    $header['operations'] = t('');
    return $header;
  }

  /**
   * {@inheritdoc}
   */
  public function buildRow(EntityInterface $entity) {
    $row['label'] = $entity->label;
    return $row + parent::buildRow($entity);
  }

  /**
   * {@inheritdoc}
   */
  public function buildOperations(EntityInterface $entity) {
    $build['add'] = array(
      '#type' => 'link',
      '#title' => t('Add'),
      '#url' => \Drupal\Core\Url::fromRoute('paragraphs_ckeditor.command.insert', array(
        'context' => $this->context->getContextString(),
        'bundle_name' => $entity->id,
      )),
      '#attributes' => array(
        'class' => array(
          'button',
          'use-ajax',
        ),
      ),
    );
    return $build;
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
  }
}
