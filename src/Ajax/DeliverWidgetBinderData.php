<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;

/**
 * Ajax command for delivering widget binder model collections to the client.
 */
class DeliverWidgetBinderData implements CommandInterface {

  /**
   * The module name that will trigger the appropriate widget binder instance.
   *
   * @var string
   */
  protected $moduleName;

  /**
   * The widget binder data models to be delivered.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData
   */
  protected $data;

  /**
   * Creates a DeliverWidgetBinderData command.
   *
   * @param string $module_name
   *   The module name implementing the editor integration.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The data collection to deliver.
   */
  public function __construct($module_name, WidgetBinderData $data) {
    $this->moduleName = $module_name;
    $this->data = $data;
  }

  /**
   * {@inheritdoc}
   */
  public function render() {
    $command = [
      'command' => 'paragraphs_editor_data',
      'module' => $this->moduleName,
    ] + $this->data->toArray();
    return $command;
  }

}
