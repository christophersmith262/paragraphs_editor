<?php

namespace Drupal\paragraphs_editor\Plugin\ParagraphsEditor\delivery_provider;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_editor\Ajax\DeliverEditBufferItemCommand;
use Drupal\paragraphs_editor\Ajax\DeliverEditorWidgetCommand ;
use Drupal\paragraphs_editor\Ajax\OpenModalCommand;
use Drupal\paragraphs_editor\Ajax\CloseModalCommand;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
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
    $response->addCommand(new OpenModalCommand($title, $contents, $this->context->getContextString()));
  }

  /**
   * {@inheritdoc}
   */
  public function render(AjaxResponse $response, EditBufferItemInterface $item) {
    $insert = ($this->context->getAdditionalContext('command') == 'insert');
    $response->addCommand(new DeliverEditBufferItemCommand($this->context->getContextString(), $item, $insert));
  }

  /**
   * {@inheritdoc}
   */
  public function duplicate(AjaxResponse $response, EditBufferItemInterface $item, $editor_widget_id) {
    $response->addCommand(new DeliverEditBufferItemCommand($this->context->getContextString(), $item));
    $response->addCommand(new DeliverEditorWidgetCommand($this->context->getContextString(), $item->getEntity(), $editor_widget_id));
  }

  /**
   * {@inheritdoc}
   */
  public function close(AjaxResponse $response) {
    $response->addCommand(new CloseModalCommand($this->context->getContextString()));
  }
}
