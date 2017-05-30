<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\WidgetBinderData;

class DeliverWidgetBinderData implements CommandInterface {

  protected $moduleName;
  protected $data;

  public function __construct($module_name, WidgetBinderData $data) {
    $this->moduleName = $module_name;
    $this->data = $data;
  }

  public function render() {
    $command = [
      'command' => 'paragraphs_editor_data',
      'module' => $this->moduleName,
    ] + $this->data->toArray();
    return $command;
  }

}
