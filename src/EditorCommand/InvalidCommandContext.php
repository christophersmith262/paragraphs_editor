<?php

namespace Drupal\paragraphs_extra\EditorCommand;

class InvalidCommandContext extends CommandContext {

  public function __construct() {
    parent::__construct(NULL, NULL, NULL, NULL);
  }

  public function isValid() {
    return FALSE;
  }
}
