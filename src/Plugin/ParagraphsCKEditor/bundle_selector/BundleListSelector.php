<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\bundle_selector;

use Drupal\Core\Entity\EntityListBuilder;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\BundleSelectorInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a simple listing of bundles to choose from.
 *
 * @ParagraphsCKEditorBundleSelector(
 *   id = "list",
 *   title = @Translation("List"),
 *   description = @Translation("Provides a basic list of bundles."),
 * )
 */
class BundleListSelector extends EntityListBuilder implements BundleSelectorInterface, ContainerFactoryPluginInterface {

  /**
   * The plugin id for this plugin.
   *
   * @var string
   */
  protected $pluginId;

  /**
   * The plugin definition for this plugin.
   *
   * @var object
   */
  protected $pluginDefinition;

  /**
   * The command context the plugin is executing within.
   *
   * @var Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface
   */
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
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
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
    $form['search'] = array(
      '#title' => 'Search',
      '#type' => 'entity_autocomplete',
      '#target_type' => 'paragraphs_type',
    );
    $form['search_button'] = array(
      '#type' => 'submit',
      '#value' => 'Search',
      '#submit' => array('::ajaxSearchSubmit'),
      '#limit_validation_errors' => array(),
      '#ajax' => array(
        'callback' => array(get_class($this), 'ajaxSearch'),
        'wrapper' => 'test-form',
      ),
    );
    $form['options'] = array(
      '#prefix' => '<div id="test-form">',
      '#suffix' => '</div>',
      '#type' => 'table',
      '#header' => $this->buildHeader(),
      '#empty' => t('Could not find any matching options.', array('@label' => $this->entityType->getLabel())),
    );

    $input = $form_state->getUserInput();
    $search = isset($input['search']) ? $input['search'] : '';
    $search = trim(preg_replace('/\(.*\)$/', '', $search));
    dpm($search);
    $this->entities = $this->load($search);
    foreach ($this->entities as $entity) {
      $row = $this->buildRow($entity);
      if (isset($row['label'])) {
        $row['label'] = array('#markup' => $row['label']);
      }
      $form['options'][$entity->id()] = $row;
    }

    // Add an ajax link for allowing the use to cancel out of this form.
    $form['actions']['cancel'] = array(
      '#type' => 'link',
      '#title' => $this->t('Cancel'),
      '#url' => $this->context->createCommandUrl('cancel'),
      '#attributes' => array(
        'class' => array(
          'button',
          'use-ajax',
        ),
      ),
    );

    return $form;
  }

  public function ajaxSearchSubmit($form, $form_state) {
    $form_state->setRebuild();
  }

  public static function ajaxSearch($form, $form_state) {
    return $form['options'];
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
    // Create an ajax link that will take the user to an 'insert' endpoint for
    // the bundle the operation relates to.
    $build['add'] = array(
      '#type' => 'link',
      '#title' => t('Add'),
      '#url' => $this->context->createCommandUrl('insert', array(
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
    // This needs to be implemented, but we don't have anything to validate.
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    // This needs to be implemented, but we don't have anything to submit.
  }

public function load($search=NULL) {
  $entity_ids = $this->getEntityIds($search);
  $entities = $this->storage->loadMultipleOverrideFree($entity_ids);

  // Sort the entities using the entity class's sort() method.
  // See \Drupal\Core\Config\Entity\ConfigEntityBase::sort().
  uasort($entities, array($this->entityType->getClass(), 'sort'));
  return $entities;
}

protected function getEntityIds($search=NULL) {
  $query = $this->getStorage()->getQuery()
    ->sort($this->entityType->getKey('id'));

  if ($search) {
    $query->condition('label', $search, 'CONTAINS');
  }

  // Only add the pager if a limit is specified.
  if ($this->limit) {
    $query->pager($this->limit);
  }
  return $query->execute();
}
}
