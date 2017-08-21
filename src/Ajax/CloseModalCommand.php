<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CloseModalDialogCommand;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

/**
 * Closes an ajax dialog for a specific editor context.
 */
class CloseModalCommand extends CloseModalDialogCommand {

  /**
   * Creates a CloseModelCommand.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context to close the dialog for.
   * @param bool $persist
   *   (optional) Whether to persist the dialog in the DOM or not.
   *
   * @constructor
   */
  public function __construct(CommandContextInterface $context, $persist = FALSE) {
    parent::__construct($persist);
    $this->selector = '#paragraphs-ckeditor-modal-' . md5($context->getContextString());
  }

}
