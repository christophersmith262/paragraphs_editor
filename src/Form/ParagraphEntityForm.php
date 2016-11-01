<?php

namespace Drupal\paragraphs_ckeditor\Form;

use Symfony\Component\DependencyInjection\ContainerInterface;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityManager;
use Drupal\Core\Entity\EntityTypeManager;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Url;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

use Drupal\paragraphs\ParagraphInterface;

class ParagraphEntityForm extends ContentEntityForm {

  protected $context;
  protected $bufferItem;

  /**
   * {@inheritdoc}
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

    $actions['submit']['#ajax'] = array(
      'callback' => array(get_class($this), 'ajaxSubmit'),
    );

    $actions['cancel'] = array(
      '#type' => 'link',
      '#title' => $this->t('Cancel'),
      '#url' => \Drupal\Core\Url::fromRoute('paragraphs_ckeditor.command.cancel', array(
        'context' => $this->context->getContextString(),
      )),
      '#weight' => 10,
      '#attributes' => array(
        'class' => array(
          'button',
          'use-ajax',
        ),
      ),
    );

    unset($actions['delete']);

    return $actions;
  }

  static public function ajaxSubmit(array $form, FormStateInterface $form_state) {
    // Retrieve class mambers needed to build a response.
    $item = $form_state->getTemporaryValue(['paragraphs_ckeditor', 'item']);
    $delivery = $form_state->getTemporaryValue(['paragraphs_ckeditor', 'context'])->getDelivery();

    // Create a response that includes the rendered paragraph preview and
    // signal that the ajax workflow is completed.
    $response = new AjaxResponse();
    $delivery->render($response, $item);
    $delivery->close($response);

    return $response;
  }
}
