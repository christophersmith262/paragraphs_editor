<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

interface CommandContextFactoryInterface {
  public function create($entity_type, $entity_id, $field_config_id, $widget_build_id, array $settings);
}
