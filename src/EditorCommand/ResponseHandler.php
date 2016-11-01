<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\PluginManagerInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;

class ResponseHandler implements ResponseHandlerInterface {

  protected $bundleSelectorManager;
  protected $entityTypeManager;
  protected $moduleHandler;
  protected $entityManager;

  public function __construct(PluginManagerInterface $bundle_selector_manager, EntityTypeManagerInterface $entity_type_manager, ModuleHandlerInterface $module_handler, EntityManagerInterface $entity_manager) {
    $this->bundleSelectorManager = $bundle_selector_manager;
    $this->entityTypeManager = $entity_type_manager;
    $this->moduleHandler = $module_handler;
    $this->entityManager = $entity_manager;
  }

  public function deliverBundleSelectForm(CommandContextInterface $context) {
    return $this->navigate($context, t('Add Paragraph'), $this->getBundleSelectForm($context));
  }

  public function deliverParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item) {
    $title = $paragraph->isNew() ? t('Add Paragraph') : t('Edit Paragraph');
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
    $context->getDelivery()->navigate($response, $title, $contents);
    return $response;
  }

  protected function render(CommandContextInterface $context, EditBufferItemInterface $item) {
    $response = new AjaxResponse();
    $context->getDelivery()->render($response, $item);
    return $response;
  }

  protected function duplicate(CommandContextInterface $context, EditBufferItemInterface $item, $ckditor_widget_id) {
    $response = new AjaxResponse();
    $context->getDelivery()->duplicate($response, $item, $ckeditor_widget_id);
    return $response;
  }

  protected function close(CommandContextInterface $context) {
    $response = new AjaxResponse();
    $context->getDelivery()->close($response);
    return $response;
  }

  protected function getBundleSelectForm(CommandContextInterface $context) {
    $field_config = $context->getFieldConfig();
    $plugin_name = $field_config->getSetting('bundle_selector');
    return $this->bundleSelectorManager->createInstance($plugin_name);
  }

  protected function getParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item) {
    return new ParagraphEntityForm($context, $item, $this->moduleHandler, $this->entityTypeManager, $this->entityManager);
  }
}
