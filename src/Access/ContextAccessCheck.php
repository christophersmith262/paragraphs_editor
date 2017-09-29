<?php

namespace Drupal\paragraphs_editor\Access;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Routing\Access\AccessInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Session\AccountInterface;
use Symfony\Component\Routing\Route;

/**
 * An access check handler for checking user access to an editor context.
 */
class ContextAccessCheck implements AccessInterface {

  /**
   * The Drupal entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The key used by the routing requirement.
   *
   * @var string
   */
  protected $requirementsKey = '_paragraphs_editor_access_context';

  /**
   * Creates a context access check object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
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
   * @param Symfony\Component\Routing\Route $route
   *   The route the user is attempting to access.
   * @param Drupal\Core\Routing\RouteMatchInterface $route_match
   *   The route match for the route the user is attempting to access.
   * @param Drupal\Core\Session\AccountInterface $account
   *   The account to check access against.
   *
   * @return \Drupal\Core\Access\AccessResultInterface
   *   The access result for the user.
   */
  public function access(Route $route, RouteMatchInterface $route_match, AccountInterface $account) {
    // Load the context from the parameters.
    $requirement = $route->getRequirement($this->requirementsKey);
    $ands = explode('+', $requirement);
    $chain = [];
    foreach ($ands as $requirement) {
      if (preg_match('/\{(.*)\}$/', $requirement, $matches)) {
        $context = $route_match->getParameter($matches[1]);
      }
      else {
        return AccessResult::forbidden();
      }

      // If no field config could be loaded for the context, we treat this as
      // the user not being able to access the endpoint.
      $field_config = $context->getFieldConfig();
      if (!$field_config) {
        $access = AccessResult::forbidden();
      }
      else {
        $entity_type = $field_config->getTargetEntityTypeId();
        $entity_bundle = $field_config->getTargetBundle();
        $entity = $context->getEntity();

        // If the operation pertains to an existing entity, the user must have
        // edit access to perform editor commands. If it is a new entity, the
        // user must have create access.
        if ($entity) {
          $chain[] = $entity->access('edit', $account, TRUE);
        }
        else {
          $chain[] = $this->entityTypeManager->getAccessControlHandler($entity_type)
            ->createAccess($entity_bundle, $account, [], TRUE);
        }
      }
    }

    if ($chain) {
      $access = AccessResult::allowed();
      foreach ($chain as $next_access) {
        $access = $access->andIf($next_access);
      }
    }
    else {
      $access = AccessResult::neutral();
    }

    return $access;
  }

}
