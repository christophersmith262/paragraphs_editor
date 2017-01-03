<?php

namespace Drupal\paragraphs_editor\Controller;

use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

class SchemaController implements ContainerInjectionInterface {

  protected $contextFactory;

  public function __construct(CommandContextFactoryInterface $context_factory) {
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('paragraphs_editor.command.context_factory')
    );
  }

  public function get(FieldConfigInterface $field_config) {
    $bundle_filter = $this->contextFactory->createBundleFilter($field_config);
    return new JsonResponse(array_keys($bundle_filter->getAllowedBundles()));
  }
}
