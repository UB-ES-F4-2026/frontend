# Textos legales del registro

Se incluyen dos borradores en español, adaptados al registro personal y a la consulta de oportunidades de Grupo F4:

- [Condiciones de uso](condiciones-de-uso.md).
- [Política de privacidad](politica-de-privacidad.md).

Son documentos para completar y revisar antes de publicarlos, no una certificación de cumplimiento. Los marcadores entre corchetes identifican información que el repositorio no permite confirmar. La referencia territorial de trabajo es España y la Unión Europea; debe validarse con el establecimiento del titular y los mercados de destino.

## Decisiones pendientes

1. Identificar al titular y responsable real, su domicilio, identificación fiscal, contactos, dominio y datos registrales. El carácter académico del proyecto no determina quién es responsable de los datos.
2. Definir edad, capacidad y territorios admitidos. No se ha añadido una edad mínima arbitraria a la User Story.
3. Justificar la finalidad del teléfono. US01.6 lo exige, pero no explica para qué se necesita. No debe atribuirse a obligaciones de inversión, verificación por SMS o controles de identidad que no están definidos. Si no es necesario para una finalidad legítima concreta, debe pasar a ser opcional o dejar de recogerse.
4. Contrastar todos los datos y tratamientos con el backend y el despliegue reales. La historia contempla nombre, apellidos y teléfono; el borrador no acredita que todos estén implementados. Comprobar también tratamiento de credenciales, sesiones, registros, consultas y copias de seguridad.
5. Completar los plazos de conservación y sus fundamentos; identificar proveedores, subcontratistas, accesos internacionales, cookies y recursos externos. No se ha afirmado que no haya transferencias, cookies o decisiones automatizadas sin comprobarlo.
6. Validar las bases jurídicas y documentar la necesidad de los datos y la ponderación de los intereses legítimos propuestos. Añadir cualquier finalidad real que falte y retirar las que no se realicen.
7. Confirmar si el MVP es una simulación y comunicarlo claramente en su presentación si lo es. Antes de operar con dinero real, definir el papel jurídico de la plataforma, requisitos regulatorios, contratos, pagos, costes, cancelaciones y derechos de los participantes. Estos borradores no resuelven esas decisiones de negocio.

Los derechos de protección de datos deben poder ejercerse por el contacto publicado aunque la edición de perfil o la eliminación de cuenta desde la interfaz estén fuera del alcance de US01.6.

## Uso en el registro

La maqueta enlaza los archivos Markdown en una pestaña nueva para conservar el formulario. En producción deberán ofrecerse como páginas legibles y accesibles, con la versión aceptada de las condiciones identificable.

Mantener separadas estas dos declaraciones, inicialmente sin marcar:

- «Acepto las condiciones de uso».
- «Confirmo que he leído la política de privacidad».

La segunda acredita información, no un consentimiento general para tratar datos. El consentimiento para finalidades opcionales, si se incorporan, debe solicitarse por separado.

Antes de recoger datos, mostrar un resumen de privacidad junto al formulario con el responsable, finalidad, base jurídica, destinatarios o transferencias relevantes, derechos y enlace a la información completa. Completar primero los datos pendientes para que ese resumen sea fiel al servicio.

## Referencias utilizadas

Redacción original adaptada a [PRODUCT.md](../../PRODUCT.md) y [US01.6](../../user-stories/US01-6.md), apoyada en fuentes oficiales en lugar de copiar condiciones comerciales de otra plataforma:

- [RGPD, texto publicado en el BOE](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807): principios, bases jurídicas, información, derechos, seguridad y transferencias; especialmente artículos 5, 6, 12–22, 28, 32 y 44–49.
- [AEPD: deber de información](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/6-el-deber-de-informacion): información por capas y distinción entre informar y solicitar consentimiento.
- [Ley 34/2002, de servicios de la sociedad de la información](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758): identificación del prestador e información del servicio, especialmente artículo 10; revisar su aplicación al despliegue real.

Consulta de fuentes: 27 de octubre de 2026. Revisar los textos con asesoramiento jurídico antes de utilizarlos como documentos definitivos, especialmente si se habilitan inversiones reales.
