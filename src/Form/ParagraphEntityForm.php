<?php

namespace Drupal\paragraphs_ckeditor\Form;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

/**
 * The form that is shown for editing paragraph entities in ckeditor.
 *
 * This is basically just the core content entity form with a few overrides to
 * ajaxify the experience and integrate with the delivery provider plugin
 * system.
 */
class ParagraphEntityForm extends ContentEntityForm {

  /**
   * The context the editor command is being executed in.
   *
   * @var Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface
   */
  protected $context;

  /**
   * The buffer item being edited by this form.
   *
   * @var Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface
   */
  protected $bufferItem;

  /**
   * Creates a ParagraphEntityForm object.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context of the command that is invoking this form.
   * @param Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface $item
   *   An editor item (wrapped paragraph entity) to show the edit form for.
   * @param Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler service.
   * @param Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   * @param Drupal\Core\Entity\EntityManagerInterface $entity_manager
   *   The entity manager service.
   */
  public function __construct(CommandContextInterface $context, EditBufferItemInterface $item,
    ModuleHandlerInterface $module_handler, EntityTypeManagerInterface $entity_type_manager, EntityManagerInterface $entity_manager) {

    // The ContentEntityForm class actually has a whole bunch of hidden
    // dependendencies. They are injected by core via setters, however we
    // explicitly use constructor injection here to make them clear. I realize
    // this is ugly, but at least its clear (I hope).

    // The code we rely on still uses the old (deprecated) EntityManager. We
    // will rely on the standard EntityTypeManager within this class.
    parent::__construct($entity_manager);

    // Inject dependencies for parent classes.
    $this->setEntityTypeManager($entity_type_manager);
    $this->setModuleHandler($module_handler);
    $this->setEntity($item->getEntity());

    // Set dependencies for this class.
    $this->context = $context;
    $this->bufferItem = $item;
  }

  /**
   * {@inheritdoc}
   */
  public function save(array $form, FormStateInterface $form_state) {
    // Save the changes to the editor buffer.
    $this->bufferItem->overwrite($this->entity);
    $this->bufferItem->save();

    // Make properties available to the static ajax handler.
    $form_state->setTemporaryValue(['paragraphs_ckeditor', 'item'], $this->bufferItem);
    $form_state->setTemporaryValue(['paragraphs_ckeditor', 'context'], $this->context);
  }

  /**
   * {@inheritdoc}
   */
  protected function actions(array $form, FormStateInterface $form_state) {
    $actions = parent::actions($form, $form_state);

    // Make the default entity save button submit via ajax.
    $actions['submit']['#ajax'] = array(
      'callback' => array(get_class($this), 'ajaxSubmit'),
    );

    // Provide a cancel link for users to cancel the edit operation.
    $actions['cancel'] = array(
      '#type' => 'button',
      '#value' => $this->t('Cancel'),
      '#weight' => 10,
      '#ajax' => array(
        'url' => $this->context->createCommandUrl('cancel'),
        'options' => array(
          'query' => array(
          ),
        ),
      ),
    );

    unset($actions['delete']);

    return $actions;
  }

  /**
   * Handles submissions via ajax.
   *
   * @param array $form
   *   The complete form render array.
   * @param Drupal\Core\Form\FormStateInterface $form_state
   *   The associated form state.
   *
   * @return Drupal\Core\Ajax\AjaxResponse
   *   An ajax response object that delivers a rendered paragraph.
   */
  static public function ajaxSubmit(array $form, FormStateInterface $form_state) {
    // Retrieve class mambers needed to build a response.
    $item = $form_state->getTemporaryValue(['paragraphs_ckeditor', 'item']);
    $delivery = $form_state->getTemporaryValue(['paragraphs_ckeditor', 'context'])->getPlugin('delivery_provider');

    // Create a response that includes the rendered paragraph and signal that
    // the ajax workflow is completed.
    $response = new AjaxResponse();
    $delivery->render($response, $item);
    $delivery->close($response);

    return $response;
  }
}
