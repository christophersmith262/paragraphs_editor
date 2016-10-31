<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\Component\Plugin\Factory\ContainerFactory;
use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;

class ParagraphsCKEditorPluginManager extends DefaultPluginManager {

  public function __construct($type, \Traversable $namespaces, CacheBackendInterface $cache_backend, ModuleHandlerInterface $module_handler) {
    list ($plugin_interface, $annotation) = $this->getPluginTypeInfo($type);
    parent::__construct("Plugin/ParagraphsCKEditor/$type", $namespaces, $module_handler, $plugin_interface, $annotation);
    $this->alterInfo("paragraphs_ckeditor_{$type}_info");
    $this->setCacheBackend($cache_backend, "paragraphs_ckeditor_{$type}_info_plugins");
    $this->factory = new ContainerFactory($this->getDiscovery());
  }

  protected function getPluginTypeInfo($type) {
    switch ($type) {
      case 'delivery_provider':
        return array(
          'Drupal\paragraphs_ckeditor\Plugin\DeliveryProviderInterface',
          'Drupal\paragraphs_ckeditor\Annotation\ParagraphsCKEditorDeliveryProvider'
        );
      case 'bundle_selector':
        return array(
          'Drupal\paragraphs_ckeditor\Plugin\BundleSelectorInterface',
          'Drupal\paragraphs_ckeditor\Annotation\ParagraphsCKEditorBundleSelector'
        );
      default:
        throw new \Exception("Invalid plugin type '$type'");
    }
  }

}
