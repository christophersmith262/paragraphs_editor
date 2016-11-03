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
class ModalDeliveryProvider extends PluginBase implements DeliveryProviderInterface {

  /**
   * {@inheritdoc}
   */
  public function navigate(AjaxResponse $response, $title, $contents) {
    $response->setAttachments(array(
      'library' => array(
        'core/drupal.dialog.ajax',
      ),
    ));
    $response->addCommand(new OpenModalCommand($title, $contents, $this->context->getContextString()));
  }

  /**
   * {@inheritdoc}
   */
  public function render(AjaxResponse $response, EditBufferItemInterface $item) {
    $insert = ($this->context->getAdditionalContext('command') == 'insert');
    $response->addCommand(new DeliverParagraphPreviewCommand($this->context->getContextString(), $item->getEntity(), $insert));
  }

  /**
   * {@inheritdoc}
   */
  public function duplicate(AjaxResponse $response, EditBufferItemInterface $item, $ckeditor_widget_id) {
    $response->addCommand(new DeliverCopiedParagraphCommand($this->context->getContextString(), $item->getEntity(), $ckeditor_widget_id));
  }

  /**
   * {@inheritdoc}
   */
  public function close(AjaxResponse $response) {
    $response->addCommand(new CloseModalCommand($this->context->getContextString()));
  }
}
