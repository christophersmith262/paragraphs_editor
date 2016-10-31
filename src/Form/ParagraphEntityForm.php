<?php

namespace Drupal\paragraphs_ckeditor\Form;

use Symfony\Component\DependencyInjection\ContainerInterface;

use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Url;

use Drupal\paragraphs_ckeditor\Ajax\DeliverParagraphPreviewCommand;
use Drupal\paragraphs_ckeditor\Ajax\CloseModalCommand;

use Drupal\paragraphs\ParagraphInterface;

class ParagraphEntityForm extends ContentEntityForm {

  /**
   * {@inheritdoc}
   */
  public function __construct(ParagraphAjaxCommandFactory $command_factory, EditBufferItem $item,
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
    $this->setEntity($buffer_writer->original());

    // Set dependencies for this class.
    $this->commandFactory = $command_factory;
    $this->bufferWriter = $buffer_writer;
  }

  /**
   * {@inheritdoc}
   */
  public function save(array $form, FormStateInterface $form_state) {
    // Save the changes to the editor buffer.
    $this->bufferWriter->save($entity);

    // Make properties available to the static ajax handler.
    $form_state->setTemporaryValue(['paragraphs_ckeditor', 'entity'], $this->entity);
    $form_state->setTemporaryValue(['paragraphs_ckeditor', 'command_factory'], $this->commandFactory);
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
      '#url' => \Drupal\Core\Url::fromRoute('paragraphs_ckeditor.command.cancel'),
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
    $entity = $form_state->getTemporaryValue(['paragraphs_ckeditor', 'entity']);
    $command_factory = $form_state->getTemporaryValue(['paragraphs_ckeditor', 'command_factory']);

    // Create a response that includes the rendered paragraph preview and
    // signal that the ajax workflow is completed.
    $response = new AjaxResponse();
    $response->addCommand($command_factory->paragraphPreviewCommand($entity, TRUE));
    $response->addCommand($command_factory->closeFormCommand());

    return $response;
  }
}
