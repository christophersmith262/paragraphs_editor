<?php

namespace Drupal\paragraphs_editor\Plugin\ParagraphsEditor;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;

/**
 * Represents a paragraphs editor form delivery plugin.
 *
 * Delivery Provider plugins are used to change the ajax behavior of the
 * paragraphs editor editing experience. The default plugin delivers all forms
 * to the user as a modal dialog. This is built on core functionality and is
 * consistent with the way core handles other Editor dialogs, but it's not the
 * only way to display a form.
 *
 * By implementing a delivery provider plugin you can expirement with different
 * ajax behaviors for displaying forms to the user. This is built entirely on
 * top of the Drupal Ajax API.
 */
interface DeliveryProviderInterface {

  /**
   * Navigates the user to a form.
   *
   * @param Drupal\Core\Ajax\AjaxResponse
   *   The response object to add commands to.
   * @param mixed $contents
   *   The contents to be delivered to the user. This could be rendered markup
   *   or a render array.
   */
  public function navigate(AjaxResponse $response, $title, $contents);

  /**
   * Delivers a rendered paragraph to the browser.
   *
   * @param Drupal\Core\Ajax\AjaxResponse
   *   The response object to add commands to.
   * @param Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The edit buffer item to render.
   */
  public function render(AjaxResponse $response, EditBufferItemInterface $item);

  /**
   * Delivers a copy of a paragraph to the browser.
   *
   * @param Drupal\Core\Ajax\AjaxResponse
   *   The response object to add commands to.
   * @param Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The edit buffer item to render.
   * @param string $editor_widget_id
   *   The editor widget instance id the clone will apply to.
   */
  public function duplicate(AjaxResponse $response, EditBufferItemInterface $item, $editor_widget_id);

  /**
   * Closes a form for the user.
   *
   * @param Drupal\Core\Ajax\AjaxResponse
   *   The response object to add commands to.
   */
  public function close(AjaxResponse $response);
}
