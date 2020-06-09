# Define your REST API endpoints here.
# In the comments below is an example.
# For more information, see:
# http://docs.tethysplatform.org/en/dev/tethys_sdk/rest_api.html
"""
from django.http import JsonResponse
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes

@api_view(['GET'])
@authentication_classes((TokenAuthentication,))
def get_data(request):
    '''
    API Controller for getting data
    '''
    name = request.GET.get('name')
    data = {"name": name}
    return JsonResponse(data)
"""
from django.http import JsonResponse
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes
from tethysapp.hiwat.utils import get_pt_values,get_poylgon_values

def get_point_ts(request):
    json_obj = {}

    if request.method == 'GET':
        variable = None
        lat = None
        lon = None
        type = None

        if request.GET.get('lat'):
            lat = request.GET['lat']

        if request.GET.get('lon'):
            lon = request.GET['lon']

        if request.GET.get('type'):
            type = request.GET['type']

        if request.GET.get('variable'):
            variable = request.GET['variable']

        coords = lon+','+lat
        try:

            ts = get_pt_values(variable,coords,type)

            json_obj["time_series"] = ts["plot"]
            json_obj["type"] = type
            json_obj["success"] = "success"
        except Exception as e:
            json_obj["error"] = "Error processing request: "+str(e)

    return JsonResponse(json_obj)

def get_polygon_ts(request):
    json_obj = {}

    if request.method == 'GET':
        variable = None
        geom = None
        type = None

        if request.GET.get('geom'):
            geom = request.GET['geom']

        if request.GET.get('type'):
            type = request.GET['type']

        if request.GET.get('variable'):
            variable = request.GET['variable']

        try:

            ts = get_poylgon_values(variable,geom,type)

            json_obj["time_series"] = ts["plot"]
            json_obj["type"] = type
            json_obj["success"] = "success"
        except Exception as e:
            json_obj["error"] = "Error processing request: "+str(e)

    return JsonResponse(json_obj)