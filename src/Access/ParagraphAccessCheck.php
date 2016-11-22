<?php

namespace Drupal\paragraphs_editor\Access;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Routing\Access\AccessInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemFactoryInterface;
use Symfony\Component\Routing\Route;

class ParagraphAccessCheck implements AccessInterface {

  protected $itemFactory;

  /**
   * The key used by the routing requirement.
   *
   * @var string
   */
  protected $requirementsKey = '_paragraphs_editor_access_paragraph';

  public function __construct(EditBufferItemFactoryInterface $item_factory) {
    $this->itemFactory = $item_factory;
  }

  /**
   * Determines if the user has access to edit a paragraph item.
   *
   * A user has access to edit a paragraph item if the paragraph item can be
   * located within the editor context and the user has access to the editor
   * context.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to check access for.
   *
   * @return \Drupal\Core\Access\AccessResultInterface
   *   The access result for the user.
   */
  public function Access(Route $route, RouteMatchInterface $route_match, AccountInterface $account) {
    list($context_param_name, $paragraph_param_name) = explode(':', $route->getRequirement($this->requirementsKey) . ':');

    // Load the context from the parameters.
    if (preg_match('/\{(.*)\}$/', $context_param_name, $matches)) {
      $context = $route_match->getParameter($matches[1]);
    }
    else {
      return AccessResult::forbidden();
    }

    // Load the paragraph uuid from the parameters.
    if (preg_match('/\{(.*)\}$/', $paragraph_param_name, $matches)) {
      $paragraph_uuid = $route_match->getParameter($matches[1]);
    }
    else {
      $paragraph_uuid = $paragraph_param_name;
    }

    // If the paragraph item cannot be located we treat it as an access denied.
    $paragraph = $this->itemFactory->getBufferItem($context, $paragraph_uuid);
    return AccessResult::allowedIf($paragraph);
  }
}
