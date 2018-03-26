<?php

namespace Drupal\paragraphs_editor\Controller;

use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Provides an endpoint for serving paragraphs editor schema definitions.
 */
class SchemaController implements ContainerInjectionInterface {

  /**
   * Context factory containing the bundle lookup information.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * Creates a SchemaController object.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory to lookup schemas with.
   *
   * @constructor
   */
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

  /**
   * Endpoint for retrieving paragraphs editor schema information.
   *
   * @param \Drupal\Core\Field\FieldConfigInterface $field_config
   *   The field configuration to lookup the schema for.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   A JSON response containing a widget binder schema model.
   */
  public function get(FieldConfigInterface $field_config) {
    return new JsonResponse([
      [
        'type' => 'schema',
        'id' => $field_config->id(),
        'attributes' => [
          'allowed' => $this->contextFactory->getAllowedBundles($field_config),
        ],
      ],
    ]);
  }

}
