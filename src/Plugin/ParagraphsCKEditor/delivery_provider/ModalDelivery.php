<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\delivery_provider;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_ckeditor\Ajax\DeliverParagraphPreviewCommand;
use Drupal\paragraphs_ckeditor\Ajax\DeliverCopiedParagraphCommand;
use Drupal\paragraphs_ckeditor\Ajax\OpenModalCommand;
use Drupal\paragraphs_ckeditor\Ajax\CloseModalCommand;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\DeliveryProviderInterface;
use Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\PluginBase;

/**
 * Delivers paragraphs ckeditor forms in a modal dialog.
 *
 * @ParagraphsCKEditorDeliveryProvider(
 *   id = "modal",
 *   title = @Translation("Modal"),
 *   description = @Translation("Shows forms in a modal dialog.")
 * )
 */
class ModalDelivery extends PluginBase implements DeliveryProviderInterface {

  public function navigate(AjaxResponse $response, $title, $contents) {
    $response->addCommand(new OpenModalCommand($title, $contents));
  }

  public function render(AjaxResponse $response, EditBufferItemInterface $item) {
    $insert = ($this->context->getAdditionalContext('command') == 'insert');
    $response->addCommand(new DeliverParagraphPreviewCommand($this->context->getBuildId(), $item->getEntity(), $insert));
  }

  public function duplicate(AjaxResponse $response, EditBufferItemInterface $item, $ckeditor_widget_id) {
    $response->addCommand(new DeliverCopiedParagraphCommand($this->context->getBuildId(), $item->getEntity(), $ckeditor_widget_id));
  }

  public function close(AjaxResponse $response) {
    $response->addCommand(new CloseModalCommand());
  }

}
