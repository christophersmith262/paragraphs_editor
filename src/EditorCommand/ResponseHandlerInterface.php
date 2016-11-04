<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;

/**
 * Delivers ajax responses for editor commands.
 *
 * The response handler layer sits directly above the plugin layer. It is
 * responsible for directing plugins on how to behave. If you want to override
 * some functionality that you can't override by simply writing a plugin, such
 * as replacing the edit form, you can do so by providing an overwridden
 * response handler service.
 *
 * The methods in this class deal with "items" instead of "entities". Items are
 * loose wrappers around entities that provide an interface for writing the
 * entities to a persistent editor state storage while users are editing the
 * form, but before they have submitted.
 */
interface ResponseHandlerInterface {

  /**
   * Responds to an insert request by providing a bundle selection form.
   *
   * When a user clicks the "insert paragraph" CKEditor toolbar button, it
   * generates a generic insert request. From that point, the user needs to
   * decide what type of bundle they want to insert. This handler delivers the
   * form where they select the bundle.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context the command is being executed in.
   * @param Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface $item
   *   The buffer item to be rendered and delivered.
   *
   * @return Symfony\Component\HttpFoundation\Response
   *   A symfony response object to return to the user.
   */
  public function deliverBundleSelectForm(CommandContextInterface $context);

  /**
   * Responds to an edit item request by delivering an edit form.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context the command is being executed in.
   * @param Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface $item
   *   The buffer item to show the edit form for.
   *
   * @return Symfony\Component\HttpFoundation\Response
   *   A symfony response object to return to the user.
   */
  public function deliverParagraphEditForm(CommandContextInterface $context, EditBufferItemInterface $item);

  /**
   * Responds to an insert item request by rendering and delivering the item.
   *
   * In this case, the item is a wrapper around a newly created paragraph item
   * whose state has been stored. At this point the response handler just needs
   * to render and deliver it.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context the command is being executed in.
   * @param Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface $item
   *   The buffer item to show the edit form for.
   *
   * @return Symfony\Component\HttpFoundation\Response
   *   A symfony response object to return to the user.
   */
  public function deliverRenderedParagraph(CommandContextInterface $context, EditBufferItemInterface $item);

  /**
   * Respond to an item duplication request.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context the command is being executed in.
   * @param Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface $item
   *   The buffer item to duplicate.
   * @param string $ckeditor_widget_id
   *   The CKEditor widget instance id that the duplicate will be copied to.
   *
   * @return Symfony\Component\HttpFoundation\Response
   *   A symfony response object to return to the user.
   */
  public function deliverDuplicate(CommandContextInterface $context, EditBufferItemInterface $item, $ckeditor_widget_id);

  /**
   * Respond to a close form request.
   *
   * @param Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context the command is being executed in.
   * @return Symfony\Component\HttpFoundation\Response
   *   A symfony response object to return to the user.
   */
  public function deliverCloseForm(CommandContextInterface $context);
}
