<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormBuilderInterface;
use Drupal\Core\Plugin\PluginManagerInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\Form\ParagraphEntityForm;

class ResponseHandler implements ResponseHandlerInterface {

  protected $formBuilder;
  protected $entityTypeManager;
  protected $moduleHandler;
  protected $entityManager;

  public function __construct(FormBuilderInterface $form_builder, EntityTypeManagerInterface $entity_type_manager, ModuleHandlerInterface $module_handler, EntityManagerInterface $entity_manager) {
    $this->formBuilder = $form_builder;
    $this->entityTypeManager = $entity_type_manager;
    $this->moduleHandler = $module_handler;
    $this->entityManager = $entity_manager;
  }

  public function deliverBundleSelectForm(CommandContextInterface $context) {
    return $this->navigate($context, t('Add Paragraph'), $this->getBundleSelectForm($context));
  }

  public function deliverParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item) {
    $title = $item->getEntity()->isNew() ? t('Add Paragraph') : t('Edit Paragraph');
    return $this->navigate($context, $title, $this->getParagraphEditForm($context, $item));
  }

  public function deliverRenderedParagraph(CommandContextInterface $context, EditBufferItemInterface $item) {
    return $this->render($context, $item);
  }

  public function deliverDuplicate(CommandContextInterface $context, EditBufferItemInterface $item, $ckeditor_widget_id) {
    return $this->duplicate($context, $item, $ckeditor_widget_id);
  }

  public function deliverCloseForm(CommandContextInterface $context) {
    return $this->close($context);
  }

  protected function navigate(CommandContextInterface $context, $title, $contents) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->navigate($response, $title, $contents);
    return $response;
  }

  protected function render(CommandContextInterface $context, EditBufferItemInterface $item) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->render($response, $item);
    return $response;
  }

  protected function duplicate(CommandContextInterface $context, EditBufferItemInterface $item, $ckditor_widget_id) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->duplicate($response, $item, $ckeditor_widget_id);
    return $response;
  }

  protected function close(CommandContextInterface $context) {
    $response = new AjaxResponse();
    $context->getPlugin('delivery_provider')->close($response);
    return $response;
  }

  protected function getBundleSelectForm(CommandContextInterface $context) {
    $form = $context->getPlugin('bundle_selector');
    return $this->formBuilder->getForm($form);
  }

  protected function getParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item) {
    $form = new ParagraphEntityForm($context, $item, $this->moduleHandler, $this->entityTypeManager, $this->entityManager);
    return $this->formBuilder->getForm($form);
  }
}
