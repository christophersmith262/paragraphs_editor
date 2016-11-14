<?php

namespace Drupal\paragraphs_ckeditor\Controller;

use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemFactoryInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_ckeditor\EditorCommand\ResponseHandlerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * The entry point for commands being sent from the widget client.
 *
 * This controller defines the operations that the client can perform. Each
 * operation has a method in the controller, which returns an AjaxResponse
 * object containing a list of ajax commands to be executed by the client in
 * response to the editor command.
 */
class EditorCommandController implements ContainerInjectionInterface {

  /**
   * The handler used to provide command responses.
   *
   * @var \Drupal\paragraphs_ckeditor\EditorCommand\ResponseHandlerInterface
   */
  protected $responseHandler;

  protected $itemFactory;

  /**
   * Constructs an editor command controller.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager $entity_type_manager
   *   The Drupal entity type manager.
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\ResponseHandlerInterface $response_handler
   *   The handler obejct that will serve the command responses.
   */
  public function __construct(EditBufferItemFactoryInterface $item_factory, ResponseHandlerInterface $response_handler) {
    $this->itemFactory = $item_factory;
    $this->responseHandler = $response_handler;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('paragraphs_ckeditor.edit_buffer.item_factory'),
      $container->get('paragraphs_ckeditor.command.response_handler')
    );
  }

  /**
   * Entry point for requests to insert a new paragraph item.
   *
   * If bundle name is NULL, this provides a bundle selection mechanism and
   * forwards the client back to this controller method with the bundle name
   * filled in. If bundle name is not NULL, a new paragraph of the given bundle
   * name will be created and an edit form for that paragraph item will be
   * delivered to the client.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The name of a paragraph bundle to be inserted or NULL to display the
   *   bundle selection form.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The ajax response for the command.
   */
  public function insert(CommandContextInterface $context, $bundle_name = NULL) {
    if (!$bundle_name) {
      $response = $this->responseHandler->deliverBundleSelectForm($context);
    }
    else {
      $item = $this->itemFactory->createBufferItem($context, $bundle_name);
      $response = $this->responseHandler->deliverParagraphEditForm($context, $item);
    }
    return $response;
  }

  /**
   * Entry point for requests to edit a paragraph item.
   *
   * This loads the correct paragraph and any existing edits, then delivers an
   * edit form for the paragarph based on its current state.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $string $paragraph_uuid
   *   The UUID of the paragraph to generate an edit form for.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The ajax response for the command.
   */
  public function edit(CommandContextInterface $context, $paragraph_uuid) {
    $item = $this->itemFactory->getBufferItem($context, $paragraph_uuid);
    return $this->responseHandler->deliverParagraphEditForm($context, $item);
  }

  /**
   * Entry point for requests to render a paragraph item.
   *
   * Renders a paragraph item and delivers markup back to the editor so it can
   * be displayed in CKEditor.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $string $paragraph_uuid
   *   The UUID of the paragraph to deliver rendered markup for.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The ajax response for the command.
   */
  public function render(CommandContextInterface $context, $paragraph_uuid) {
    $item = $this->itemFactory->getBufferItem($context, $paragraph_uuid);
    return $this->responseHandler->deliverRenderedParagraph($context, $item);
  }

  /**
   * Entry point for requests to copy a paragraph item.
   *
   * In order to support copy and paste within the editor, we need a mechanism
   * for cloning existing paragraph entities. Additionally we handle situations
   * where paragraph items might be copied from another editor instance.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $target_context
   *   The context for the editor instance that will receive the copy.
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $source_context
   *   The context for the editor instance that will provide the copy.
   * @param string $paragraph_uuid
   *   The uuid of the paragraph entity to be copied.
   * @param string $ckeditor_widget_id
   *   The CKEditor widget id of the CKEditor widget to be updated with the newl
   *   created paragraph.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The ajax response for the command.
   */
  public function duplicate(CommandContextInterface $target_context, CommandContextInterface $source_context, $paragraph_uuid, $ckeditor_widget_id) {
    $item = $this->itemFactory->getBufferItem($source_context, $paragraph_uuid);
    $item = $this->itemFactory->duplicateBufferItem($target_context, $item);
    $item->save();
    return $this->responseHandler->deliverDuplicate($target_context, $item, $ckeditor_widget_id);
  }

  /**
   * Entry points for requests to cancel an ongoing multi-step command.
   *
   * Several operations can potentially be multi-step processes. For instance, a
   * request to insert a new paragraph starts with the user selecting which
   * bundle they want to use, then an edit form for the newly created paragraph
   * item. This method allows a user to opt out of the process at any time.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The ajax response for the command.
   */
  public function cancel(CommandContextInterface $context) {
    return $this->responseHandler->deliverCloseForm($context);
  }
}
