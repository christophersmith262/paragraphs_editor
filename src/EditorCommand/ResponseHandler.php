<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormBuilderInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\Form\ParagraphEntityForm;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface;

/**
 * Response handler for paragraphs editor commands.
 *
 * This is the default class responsible for assembling symfony responses to
 * paragraphs editor commands.
 *
 * @see Drupal\paragraphs_editor\EditorCommand\ResponseHandlerInterface
 */
class ResponseHandler implements ResponseHandlerInterface {

  /**
   * The form builder service for serving up forms.
   *
   * @var \Drupal\Core\Form\FormBuilderInterface
   */
  protected $formBuilder;

  /**
   * The entity type manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The module handler service.
   *
   * @var \Drupal\Core\Extension\ModuleHandlerInterface
   */
  protected $moduleHandler;

  /**
   * The (deprecated) entity manager service.
   *
   * This serves basically the same function as the entity type manager.
   * The only reason it is included here is because the drupal core content
   * entity edit form depends on it.
   *
   * @var \Drupal\Core\Entity\EntityManagerInterface
   */
  protected $entityManager;

  /**
   * The widget binder data compiler service.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface
   */
  protected $dataCompiler;

  /**
   * Creates a ResponseHandler object.
   *
   * @param \Drupal\Core\Form\FormBuilderInterface $form_builder
   *   The form builder for generating forms.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler service.
   * @param \Drupal\Core\Entity\EntityManagerInterface $entity_manager
   *   The entity manager service.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface $data_compiler
   *   The widget binder data compiler service.
   */
  public function __construct(FormBuilderInterface $form_builder, EntityTypeManagerInterface $entity_type_manager, ModuleHandlerInterface $module_handler, EntityManagerInterface $entity_manager, WidgetBinderDataCompilerInterface $data_compiler) {
    $this->formBuilder = $form_builder;
    $this->entityTypeManager = $entity_type_manager;
    $this->moduleHandler = $module_handler;
    $this->entityManager = $entity_manager;
    $this->dataCompiler = $data_compiler;
  }

  /**
   * {@inheritdoc}
   */
  public function deliverBundleSelectForm(CommandContextInterface $context) {
    return $this->navigate($context, $this->getBundleSelectForm($context));
  }

  /**
   * {@inheritdoc}
   */
  public function deliverParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item) {
    return $this->navigate($context, $this->getParagraphEditForm($context, $item));
  }

  /**
   * {@inheritdoc}
   */
  public function deliverRenderedParagraph(CommandContextInterface $context, EditBufferItemInterface $item) {
    return $this->render($context, $item);
  }

  /**
   * {@inheritdoc}
   */
  public function deliverDuplicate(CommandContextInterface $context, EditBufferItemInterface $item, $editor_widget_id) {
    return $this->duplicate($context, $item, $editor_widget_id);
  }

  /**
   * {@inheritdoc}
   */
  public function deliverCloseForm(CommandContextInterface $context) {
    return $this->close($context);
  }

  /**
   * Generates an ajax response for opening a form.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is executing within.
   * @param mixed $contents
   *   A render array or markup string containing the contents to be delivered.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   An ajax response to deliver.
   */
  protected function navigate(CommandContextInterface $context, $contents) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->navigate($response, $this->getDialogTitle($context), $contents);
    return $response;
  }

  /**
   * Generates an ajax response for delivering a paragraph.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is executing within.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The buffer item to be rendered in the response.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   An ajax response to deliver.
   */
  protected function render(CommandContextInterface $context, EditBufferItemInterface $item) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->sendData($response, $this->dataCompiler->compile($context, $item));
    return $response;
  }

  /**
   * Generates an ajax response for delivering a duplicated paragraph.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is executing within.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The buffer item to be duplicated in the response.
   * @param string $editor_widget_id
   *   The editor widget id to target for receiving the duplicated item.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   An ajax response to deliver.
   */
  protected function duplicate(CommandContextInterface $context, EditBufferItemInterface $item, $editor_widget_id) {
    $response = new AjaxResponse();
    $context->addAdditionalContext('widgetId', $editor_widget_id);
    $data = $this->dataCompiler->compile($context, $item);
    $context->getPlugin('delivery_provider')->sendData($response, $data);
    return $response;
  }

  /**
   * Generates an ajax response for closing a form.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is executing within.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   An ajax response to deliver.
   */
  protected function close(CommandContextInterface $context) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->close($response);
    return $response;
  }

  /**
   * Gets a bundle select form object to deliver the user.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is executing within.
   *
   * @return array
   *   A render array for the bundle select form.
   */
  protected function getBundleSelectForm(CommandContextInterface $context) {
    $form = $context->getPlugin('bundle_selector');
    return $this->formBuilder->getForm($form);
  }

  /**
   * Gets a paragraph edit form object to deliver the user.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is executing within.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The edit buffer item to get the form for.
   *
   * @return array
   *   A render array for the paragraph edit form.
   */
  protected function getParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item) {
    $form = new ParagraphEntityForm($context, $item, $this->moduleHandler, $this->entityTypeManager, $this->entityManager, $this->dataCompiler);
    return $this->formBuilder->getForm($form);
  }

  /**
   * Gets the dialog title for paragraph editor command dialogs.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context the command is exuting in.
   *
   * @return string
   *   The title to use in the dialog box.
   */
  protected function getDialogTitle(CommandContextInterface $context) {
    if ($context->getAdditionalContext('command') == 'insert') {
      return t('Insert @title', ['@title' => $context->getSetting('title')]);
    }
    else {
      return t('Edit @title', ['@title' => $context->getSetting('title')]);
    }
  }

}
