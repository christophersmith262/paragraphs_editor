<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

class InvalidCommandContext extends CommandContext {

  public function __construct() {
    parent::__construct(NULL, NULL, NULL, NULL, array());
  }

  public function isValid() {
    return FALSE;
  }
}
