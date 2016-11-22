<?php

namespace Drupal\paragraphs_editor\EditorCommand;

/**
 * An object for representing invalid command contexts.
 *
 * @see Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
 */
class InvalidCommandContext extends CommandContext {

  /**
   * Creates a command context without any valid values.
   */
  public function __construct() {
    parent::__construct(NULL, NULL, NULL, NULL, array());
  }

  /**
   * {@inheritdoc}
   */
  public function isValid() {
    return FALSE;
  }
}
