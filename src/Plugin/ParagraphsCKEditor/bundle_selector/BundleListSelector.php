<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\bundle_selector;

use Drupal\Core\Entity\EntityListBuilder;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs_ckeditor\ParagraphCommand\BundleSelector\BundleSelectorInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Entity\EntityInterface;

/**
 * Provides a simple listing of bundles to choose from.
 *
 * @ParagraphsCKEditorBundleSelector(
 *   id = "list",
 *   title = @Translation("List Bundle Selector"),
 *   description = @Translation("Provides a basic list of bundles."),
 * )
 */
class BundleSelectionList extends EntityListBuilder implements BundleSelectorInterface {

  protected $routeParams;

  /**
   * {@inheritdoc}
   */
  public function __construct(CommandContextInterface $context, EntityTypeManagerInterface $entity_type_manager) {
    parent::__construct($entity_type_manager->getDefinition('paragraphs_type'), $entity_type_manager->getStorage('paragraphs_type'));
    $this->routeParams = $route_params;
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
      '#url' => \Drupal\Core\Url::fromRoute('paragraphs_ckeditor.command.cancel'),
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
        'bundle_name' => $entity->id,
      ) + $this->routeParams),
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
