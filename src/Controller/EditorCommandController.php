<?php

namespace Drupal\paragraphs_ckeditor\Controller;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemDuplicatorInterface;
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
   * The Drupal entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The entity storage handler for the paragraph entity type.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $storage;

  /**
   * The handler used to provide command responses.
   *
   * @var \Drupal\paragraphs_ckeditor\EditorCommand\ResponseHandlerInterface
   */
  protected $responseHandler;

  /**
   * The handler used to clone paragraph items.
   *
   * @var \Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemDuplicatorInterface
   */
  protected $duplicator;

  /**
   * Constructs an editor command controller.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager $entity_type_manager
   *   The Drupal entity type manager.
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\ResponseHandlerInterface $response_handler
   *   The handler obejct that will serve the command responses.
   * @param \Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemDuplicatorInterface $duplicator
   *   The entity duplication handler that will be responsible for cloning
   *   paragraphs.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, ResponseHandlerInterface $response_handler, EditBufferItemDuplicatorInterface $duplicator) {
    $this->storage = $this->entityTypeManager->getStorage('paragraph');
    $this->responseHandler = $response_handler;
    $this->duplicator = $duplicator;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('paragraphs_ckeditor.paragraph_command.response_handler'),
      $container->get('paragraphs_ckeditor.edit_buffer.item_duplicator')
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
      $item = $this->createBufferItem($context, $bundle_name);
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
    $item = $this->getBufferItem($context, $paragraph_uuid);
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
    $item = $this->getBufferItem($context, $paragraph_uuid);
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
    $item = $this->getBufferItem($source_context, $paragraph_uuid);
    $item = $this->duplicator->duplicate($target_context, $item);
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

  /**
   * Determines if the user has access to manipulate the requested entity.
   *
   * In order to perform any command on an editor instance, the user must have
   * access to edit the entity the instance is attached to, or for new entities,
   * the user must have access to create entities.
   *
   * This method will also filter out "invalid" context objects before the
   * actual controller method that executes the request is called.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   *
   * @return \Drupal\Core\Access\AccessResultInterface
   *   The access result for the user.
   */
  public function access(CommandContextInterface $context) {
    // If no field config could be loaded for the context, we treat this as the
    // user not being able to access the endpoint.
    $field_config = $context->getFieldConfig();
    if (!$field_config) {
      $access = AccessResult::forbidden();
    }
    else {
      $entity_type = $field_config->getEntityTypeId();
      $entity_bundle = $field_config->bundle();
      $entity = $context->getEntity();

      // If the operation pertains to an existing entity, the user must have
      // edit access to perform editor commands. If it is a new entity, the user
      // must have create access.
      if ($entity) {
        $access = $entity->access('edit');
      }
      else {
        $access = $this->entityTypeManager->getAccessControlHandler($entity_type)
          ->createAccess($entity_bundle);
      }
    }

    return $access;
  }

  /**
   * Determines if the user has access to insert a given bundle.
   *
   * A user has access to insert a given bundle if the bundle is allowed by the
   * field config.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The name of the bundle being inserted.
   *
   * @return \Drupal\Core\Access\AccessResultInterface
   *   The access result for the user.
   */
  public function accessInsert(CommandContextInterface $context, $bundle_name) {
    // If the bundle name is empty we just pass through to straight context
    // access as this means that no bundle has been selected yet. Once a bundle
    // name is selected, we additionally validate the bundle against the
    // context.
    if ($bundle_name) {
      return AccessResult::allowedIf($context->isValidBundle($bundle_name))->andIf($this->access($context));
    }
    else {
      return $this->access($context);
    }
  }

  /**
   * Determines if the user has access to edit a paragraph item.
   *
   * A user has access to edit a paragraph item if the paragraph item can be
   * located within the editor context and the user has access to the editor
   * context.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to check access for.
   *
   * @return \Drupal\Core\Access\AccessResultInterface
   *   The access result for the user.
   */
  public function accessParagraph(CommandContextInterface $context, $paragraph_uuid) {
    // If the paragraph item cannot be located we treat it as an access denied,
    // otherwise we just ensure that the user has access to the context.
    $paragraph = $this->getBufferItem($paragraph_uuid);
    if (!$paragraph) {
      $access = AccessResult::forbidden();
    }
    else {
      $access = $this->access($context);
    }
    return $access;
  }

  /**
   * Determines if the user has access to duplicate an entity across contexts.
   *
   * In order for a user to duplicate an item, the user must have the
   * permissions defined in the generic access method for both the target and
   * source editors, and must have access to the paragraph being requested.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $target_context
   *   The context for the editor instance that will receive the copy.
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $source_context
   *   The context for the editor instance that will provide the copy.
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to be duplicated.
   *
   * @return \Drupal\Core\Access\AccessResultInterface
   *   The access result for the user.
   */
  public function accessDuplicate(CommandContextInterface $target_context, CommandContextInterface $source_context, $paragraph_uuid) {
    return $this->access($target_context)->andIf($this->accessParagraph($source_context, $paragraph_uuid));
  }

  /**
   * Creates a buffer item within a context.
   *
   * This should never be called inside an access check. Only call this after
   * context validation has completed successfully.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The bundle name for the paragraph to be created.
   *
   * @return \Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  protected function createBufferItem(CommandContextInterface $context, $bundle_name) {
    // We don't have to verify that getBuffer doesn't return NULL here since
    // this should never be called until after context validation is complete.
    return $context->getBuffer()->createItem($this->createParagraph($bundle_name));
  }

  /**
   * Retrieves a paragraph item from within a context buffer.
   *
   * This is safe to call within access checks since we verify that the buffer
   * is set before using it. This will create the paragraph item in the buffer
   * it does not already exist.
   *
   * @param \Drupal\paragraphs_ckeditor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The bundle name for the paragraph to be created.
   *
   * @return \Drupal\paragraphs_ckeditor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  protected function getBufferItem(CommandContextInterface $context, $paragraph_uuid) {
    // Since this could be called before the context is validated, we need to
    // account for the buffer being invalid.
    $buffer = $context->getBuffer();
    if ($buffer) {
      $item = $buffer->getItem($paragraph_uuid);

      // If the paragraph didn't already exist in the buffer we attempt to load
      // it from the database. After loading it, we also have to verify that it
      // belonged to the entity the the editor context belongs to. If that
      // succeeds, we add it to the buffer.
      if (!$item) {
        $paragraph = $this->getParagraph($paragraph_uuid);
        if ($paragraph) {
          if ($paragraph->getParentEntity() != $context->getEntity()) {
            $paragraph = NULL;
          }
          else {
            $item = $buffer->createItem($paragraph);
          }
        }
      }
    }
    else {
      $item = NULL;
    }
    return $item;
  }

  /**
   * Creates a new paragraph entity.
   *
   * @param string $bundle_name
   *   The bundle name of the paragraph entity to be created.
   *
   * @return \Drupal\paragraphs\ParagraphInterface
   *   The newly created paragraph.
   */
  protected function createParagraph($bundle_name) {
    $paragraph = $this->storage->create(array(
      'type' => $bundle_name,
    ));
    return $paragraph;
  }

  /**
   * Retrieves a paragraph by uuid.
   *
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to be retrieved.
   *
   * @return \Drupal\paragraphs\ParagraphInterface
   *   The retrieved paragraph, or NULL if no such paragraph could be found.
   */
  protected function getParagraph($paragraph_uuid) {
    $entities = $this->storage->loadByProperties(array('uuid' => $paragraph_uuid));
    if($entities) {
      return reset($entities);
    }
    else {
      return NULL;
    }
  }
}
