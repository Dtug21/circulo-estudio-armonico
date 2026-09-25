# Círculo: estudio armónico


**Úsala en línea:** <https://dtug21.github.io/circulo-estudio-armonico/>
Aplicación web estática para aprender el círculo de quintas, explorar tonalidades y escalas, crear progresiones, probar patrones rítmicos y guardar ideas musicales.

## Secciones

- **Aprender:** teoría, retos interactivos y recorrido guiado por los controles de la app.
- **Explorar:** círculo de quintas, tonalidades relativas, escalas, armaduras y acordes diatónicos.
- **Crear:** progresiones, acordes, tempo, escucha sintetizada, patrones de batería/bajo y exportación MIDI.
- **Ideas:** biblioteca local con informes de las versiones guardadas y acceso para retomarlas.

## Ejecutar localmente

Requiere Python 3. Desde esta carpeta ejecuta:

```powershell
py -m http.server 8000
```

Abre <http://localhost:8000/tutorial.html> en el navegador.

Para probarla desde un teléfono en la misma red Wi-Fi, inicia el servidor enlazándolo a la red:

```powershell
py -m http.server 8000 --bind 0.0.0.0
```

Busca la dirección IPv4 de la computadora con `ipconfig` y abre `http://IP-DE-LA-COMPUTADORA:8000/tutorial.html` en el teléfono. Si Windows pregunta, permite el acceso solo en redes privadas.

## Guardado y MIDI

La sesión actual, las ideas y el borrador de recuperación se guardan en el almacenamiento local del navegador. No hay servidor, cuenta ni sincronización entre dispositivos. La exportación MIDI contiene notas, duraciones y tempo; los sonidos sintetizados de preescucha no se incluyen como audio.

No requiere instalación de dependencias ni proceso de compilación.

## Licencia

MIT. Ver [LICENSE](LICENSE).
