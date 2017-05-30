<?php

namespace Drupal\paragraphs_editor\Plugin\ParagraphsEditor\delivery_provider;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_editor\Ajax\CloseModalCommand;
use Drupal\paragraphs_editor\Ajax\DeliverWidgetBinderData;
use Drupal\paragraphs_editor\Ajax\OpenModalCommand;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_editor\EditorCommand\WidgetBinderData;
use Drupal\paragraphs_editor\Plugin\ParagraphsEditor\DeliveryProviderInterface;
use Drupal\paragraphs_editor\Plugin\ParagraphsEditor\PluginBase;

/**
 * Delivers paragraphs editor forms in a modal dialog.
 *
 * @ParagraphsEditorDeliveryProvider(
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
    $response->addCommand(new OpenModalCommand($title, $contents, $this->context));
  }

  /**
   * {@inheritdoc}
   */
  public function close(AjaxResponse $response) {
    $response->addCommand(new CloseModalCommand($this->context));
  }

  /**
   * {@inheritdoc}
   */
  public function sendData(AjaxResponse $response, WidgetBinderData $data) {
    $response->addCommand(new DeliverWidgetBinderData($this->context->getAdditionalContext('module'), $data));
  }
}
