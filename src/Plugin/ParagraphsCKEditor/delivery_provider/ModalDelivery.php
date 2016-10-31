<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\delivery_provider;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\DeliveryProviderInterface;

/**
 * Delivers paragraphs ckeditor forms in a modal dialog.
 *
 * @ParagraphsCKEditorDeliveryProvider(
 *   id = "modal",
 *   title = @Translation("Modal"),
 *   description = @Translation("Shows forms in a modal dialog.")
 * )
 */
class ModalDelivery implements DeliveryProviderInterface {

  public function navigate(AjaxResponse $response, CommandContextInterface $context, $title, $contents) {
    $response->addCommand(new OpenModalCommand($title, $contents));
  }

  public function render(AjaxResponse $response, CommandContextInterface $context, EditBufferItemInterface $item) {
    $response->addCommand(new DeliverParagraphPreviewCommand($context->getBuildId(), $entity, $insert));
  }

  public function duplicate(AjaxResponse $response, CommandContextInterface $context, EditBufferItemInterface $item, $ckeditor_widget_id) {
  }

  public function close(AjaxResponse $response, CommandContextInterface $context) {
    $response->addCommand(new CloseModalCommand());
  }

}
