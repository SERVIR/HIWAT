import datetime
from collections import defaultdict,OrderedDict
import json
import operator
import os, tempfile, shutil,functools
import requests
import csv
import json
import calendar
import time
import netCDF4
from netCDF4 import Dataset
from tethysapp.hiwat.config import *
import numpy as np
import shapely.geometry
import webcolors
import xml.etree.ElementTree as ET
import logging

log=logging.getLogger(__name__)
# cf = open(COLORS_PICKLE,'rb')
# cPick = cPickle.load(cf)
# cf.close()
#
# cl1 = [[0.0000, 0.9255, 0.9255],[0.0039, 0.6275, 0.9647],[0.0000, 0.0000, 0.9647],[0.0000, 1.0000, 0.0000],[0.0000, 0.7843, 0.0000],[0.0000, 0.5647, 0.0000],[1.0000, 1.0000, 0.0000],[0.9059, 0.7529, 0.0000],[1.0000, 0.5647, 0.0000],[1.0000, 0.0000, 0.0000],[0.8392, 0.0000, 0.0000],[0.7529, 0.0000, 0.0000],[1.0000, 0.0000, 1.0000],[0.6000, 0.3333, 0.7882]]
#
# c = {}
# for color in cPick:
#     hex = webcolors.rgb_to_hex((int(cPick[color][0]*255),int(cPick[color][1]*255),int(cPick[color][2]*255)))
#     c[color] = hex
#
# i = 1
# for color in cl1:
#     hex = webcolors.rgb_to_hex((int(color[0] * 255), int(color[1] * 255), int(color[2] * 255)))
#     keygen = str(i)
#     c[keygen] = hex
#     i+=1

def get_pt_values(s_var,geom_data,interval):

    #Empty list to store the timeseries values
    ts_plot = []

    json_obj = {}

    #Defining the lat and lon from the coords string
    coords = geom_data.split(',')
    stn_lat = float(coords[1])
    stn_lon = float(coords[0])



    nc_files = get_hiwat_file()

    nc_file = nc_files[interval]

    # if interval == 'det':
    #     nc_file = HIWAT_DET
    # if interval == 'hourly':
    #     nc_file = HIWAT_HOURLY
    # if interval == 'day1':
    #     nc_file = HIWAT_DAY1
    # if interval == 'day2':
    #     nc_file = HIWAT_DAY2

    nc_fid = Dataset(nc_file, 'r') #Reading the netCDF file
    lis_var = nc_fid.variables
    lats = nc_fid.variables['latitude'][:]  #Defining the latitude array
    lons = nc_fid.variables['longitude'][:] #Defining the longitude array
    field = nc_fid.variables[s_var][:]   #Defning the variable array
    time = nc_fid.variables['time'][:]

    abslat = np.abs(lats - stn_lat) #Finding the absolute latitude
    abslon = np.abs(lons - stn_lon) #Finding the absolute longitude
    
    lat_idx = (abslat.argmin())
    lon_idx = (abslon.argmin())

    if interval == 'det':
        for timestep, v in enumerate(time):
            val = field[timestep, lat_idx, lon_idx]
            time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp,float(val)])
            ts_plot.sort()

    if interval == 'hourly':
        for timestep, v in enumerate(time):
            val = field[timestep, lat_idx, lon_idx]
            dt_str = netCDF4.num2date(lis_var['time'][timestep], units=lis_var['time'].units,
                                      calendar=lis_var['time'].calendar)
            # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
            time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
            # time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp,float(val)])
            ts_plot.sort()

    if interval == 'day1' or interval == 'day2':
        val = field[0, lat_idx, lon_idx]
        dt_str = netCDF4.num2date(lis_var['time'][0], units=lis_var['time'].units,
                                  calendar=lis_var['time'].calendar)
        # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
        time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
        ts_plot.append([time_stamp, float(val)])
        ts_plot.sort()

    # Returning the list with the timeseries values and the point so that they can be displayed on the graph.
    point = [round(stn_lat,2),round(stn_lon,2)]
    json_obj["plot"] = ts_plot
    json_obj["geom"] = point

    return json_obj


def get_poylgon_values(s_var, geom_data, interval):
    # Empty list to store the timeseries values
    ts_plot = []

    json_obj = {}

    # Defining the lat and lon from the coords string
    poly_geojson = json.loads(geom_data)
    shape_obj = shapely.geometry.asShape(poly_geojson)
    bounds = shape_obj.bounds

    miny = float(bounds[1])
    minx = float(bounds[0])
    maxx = float(bounds[2])
    maxy = float(bounds[3])

    nc_files = get_hiwat_file()

    nc_file = nc_files[interval]

    # if interval == 'det':
    #     nc_file = HIWAT_DET
    # if interval == 'hourly':
    #     nc_file = HIWAT_HOURLY
    # if interval == 'day1':
    #     nc_file = HIWAT_DAY1
    # if interval == 'day2':
    #     nc_file = HIWAT_DAY2
    #
    nc_fid = Dataset(nc_file, 'r')  # Reading the netCDF file
    lis_var = nc_fid.variables
    lats = nc_fid.variables['latitude'][:]  # Defining the latitude array
    lons = nc_fid.variables['longitude'][:]  # Defining the longitude array
    field = nc_fid.variables[s_var][:]  # Defning the variable array
    time = nc_fid.variables['time'][:]
    abslat = np.abs(lats - miny)
    abslon = np.abs(lons - minx)
    abslat2 = np.abs(lats - maxy)
    abslon2 = np.abs(lons - maxx)
    lon_idx = (abslat.argmin())
    lat_idx = (abslon.argmin())
    lon2_idx = (abslat2.argmin())
    lat2_idx = (abslon2.argmin())
    #
    # lat_idx = (abslat.argmin())
    # lon_idx = (abslon.argmin())
    #
    if interval == 'det':
        for timestep, v in enumerate(time):
            vals = field[timestep,lat_idx:lat2_idx, lon_idx:lon2_idx]
            val = np.mean(vals)
            time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp, float(val)])
            ts_plot.sort()

    if interval == 'hourly':
        for timestep, v in enumerate(time):
            vals = field[timestep, lat_idx:lat2_idx, lon_idx:lon2_idx]
            val = np.mean(vals)
            dt_str = netCDF4.num2date(lis_var['time'][timestep], units=lis_var['time'].units,
                                      calendar=lis_var['time'].calendar)
            # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
            time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
            # time_stamp = time[timestep] * 1000
            ts_plot.append([time_stamp, float(val)])
            ts_plot.sort()

    if interval == 'day1' or interval == 'day2':
        vals = field[0, lat_idx:lat2_idx, lon_idx:lon2_idx]
        val = np.mean(vals)
        dt_str = netCDF4.num2date(lis_var['time'][0], units=lis_var['time'].units,
                                  calendar=lis_var['time'].calendar)
        # dt_str = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
        time_stamp = calendar.timegm(dt_str.utctimetuple()) * 1000
        ts_plot.append([time_stamp, float(val)])
        ts_plot.sort()

    geom = [round(minx,2),round(miny,2),round(maxx,2),round(maxy,2)]

    json_obj["plot"] = ts_plot
    json_obj["geom"] = geom

    return json_obj

# get_pt_values('TMP_2maboveground','91.1,20.7')
def generate_variables_meta():
    db_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'public/data/var_info.txt')
    variable_list = []
    var_issues = []
    with open(db_file, mode='r') as f:
        f.readline()  # Skip first line

        lines = f.readlines()

    for line in lines:
        if line != '':
            line = line.strip()
            linevals = line.split('|')
            variable_id = linevals[0]
            category = linevals[1]
            display_name = linevals[2]
            units = linevals[3]
            vmin = linevals[4]
            vmax = linevals[5]
            start = linevals[6]
            end = linevals[7]

            try:
                # print variable_id.lower()
                colors_list = retrieve_colors(str(variable_id).lower())
                scale = calc_color_range(float(vmin), float(vmax),len(colors_list))
                variable_list.append({
                    'id': variable_id,
                    'category': category,
                    'display_name': display_name,
                    'units': units,
                    'min': vmin,
                    'max': vmax,
                    'start': start,
                    'end': end,
                    'scale': scale,
                    'colors_list':colors_list
                })
            except Exception as e:
                # print variable_id,e
                var_issues.append(variable_id)
                scale = calc_color_range(float(vmin), float(vmax), 20)
                variable_list.append({
                    'id': variable_id,
                    'category': category,
                    'display_name': display_name,
                    'units': units,
                    'min': vmin,
                    'max': vmax,
                    'start': start,
                    'end': end,
                    'scale': scale
                })
                continue


    # print var_issues
    return variable_list


def retrieve_colors(field):
    fillcols = None

    if ('tmp_2m' in field):
        clevs = [-27, -24, -21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42]
        fillcols = [c['57'], c['55'], c['53'], c['51'], c['49'], c['47'], c['45'], c['43'], c['41'], c['39'],
                    c['37'], c['35'], c['33'], c['31'], c['22'], c['23'], c['25'], c['27'], c['29'], c['62'],
                    c['63'], c['65'], c['67'], c['69'], c['75'], c['77'], c['79']]
        below = c['59']
        above = c['79']
    elif ('dpt_2m' in field):
        clevs = [-27, -24, -21, -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30]
        fillcols = [c['57'], c['55'], c['53'], c['51'], c['49'], c['47'], c['45'], c['43'], c['41'], c['39'],
                    c['37'], c['35'], c['33'], c['31'], c['22'], c['23'], c['25'], c['27'], c['29'], c['62']]
        below = c['59']
        above = c['62']
    elif ('sbcape' in field):
        clevs = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000]
        fillcols = [c['52'], c['55'], c['49'], c['46'], c['43'], c['38'], c['36'], c['34'], c['22'], c['23'],
                    c['24'], c['25'], c['26'], c['27'], c['29']]
        below = 'white'
        above = c['29']
    elif ('spd10m' in field):
        clevs = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]
        fillcols = [c['2'], c['3'], c['4'], c['5'], c['6'], c['7'], c['8'], c['9'], c['10'], c['11'], c['12'], c['13']]
        below = 'white'
        above = 'magenta'
    elif ('refc' in field):
        clevs = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]
        fillcols = [c['1'], c['2'], c['3'], c['4'], c['5'], c['6'], c['7'], c['8'], c['9'], c['10'], c['11'], c['12'], c['13'], c['14']]
        below = 'white'
        above = 'purple'
        # Use colors/contour intervals consistent with grads plots for deterministic runs.
    elif ('prec1h' in field or 'prec3h' in field or 'prec6h' in field ):
        clevs = [1, 2, 5, 10, 15, 20, 25, 50, 75, 100, 125, 150]
        fillcols = [c['33'], c['35'], c['37'], c['39'], c['43'], c['45'], c['47'], c['49'], c['53'], c['55'],
                    c['57'], c['59']]
        below = 'white'
        above = 'purple'
    elif ('prec12h' in field or 'prec24h' in field or 'prectot' in field):
        clevs = [1, 2, 5, 10, 15, 20, 25, 50, 75, 100, 125, 150, 200, 250, 300]
        fillcols = [c['33'], c['35'], c['37'], c['39'], c['43'], c['45'], c['47'], c['49'], c['53'], c['55'],
                    c['57'], c['59'], c['65'], c['67'], c['69']]
        below = 'white'
        above = 'purple'
    elif ('tcolg' in field):
        clevs = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]
        fillcols = [c['1'], c['2'], c['3'], c['4'], c['5'], c['6'], c['7'], c['8'], c['9'], c['10'], c['11'], c['12'], c['13'], c['14']]
        below = 'white'
        above = 'purple'
    elif ('lfa' in field):
        #      clevs = [0.07,0.5,1,2,3,4,5,6,7,8,9,10,12,14]
        clevs = [0.1, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14]
        fillcols = [c['1'], c['2'], c['3'], c['4'], c['5'], c['6'], c['7'], c['8'], c['9'], c['10'], c['11'], c['12'], c['13'], c['14']]
        below = 'white'
        above = 'purple'
    elif (('uphlcy16' in field) or ('uphlcy25' in field) or ('uphlcy' in field)):
        clevs = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700]
        fillcols = [c['1'], c['2'], c['3'], c['4'], c['5'], c['6'], c['7'], c['8'], c['9'], c['10'], c['11'], c['12'], c['13'], c['14']]
        below = 'white'
        above = 'purple'
    elif('apcp' in field):
        fillcols = [c['33'],c['35'],c['37'],c['39'], c['43'],c['45'], c['47'], c['49'],c['53'],c['55'],c['57'],c['59'],c['65'],c['67'],c['69']]
    elif('cape' in field):
        fillcols = [c['52'], c['55'], c['49'], c['46'], c['43'], c['38'], c['36'], c['34'], c['22'], c['23'], c['24'],
                    c['25'], c['26'], c['27'], c['29']]
    # print webcolors.rgb_to_hex((int(c['57'][0]*255),int(c['57'][1]*255),int(c['57'][2]*255)))

    # color_str = ','.join(map(str, fillcols))
    # print color_str
    return fillcols

def calc_color_range(min,max,classes):
    # breaks = None

    if classes is not None:
        breaks = int(classes)
    else:
        breaks = int(20)

    interval = float(abs((max - min) / breaks))

    if interval == 0:
        scale = [0] * breaks
    else:
        scale = np.arange(min, max, interval).tolist()

    return scale

def get_thredds_info():
    catalog_url = THREDDS_catalog

    catalog_wms = THREDDS_wms

    urls_obj = {}
    if catalog_url[-1] != "/":
        catalog_url = catalog_url + '/'

    if catalog_wms[-1] != "/":
        catalog_wms = catalog_wms + '/'

    catalog_xml_url = catalog_url+'catalog.xml'

    possible_dates = []
    valid_dates = []

    cat_response = requests.get(catalog_xml_url,verify=False)

    cat_tree = ET.fromstring(cat_response.content)

    for elem in cat_tree.iter():
        for k, v in elem.attrib.items():
            if 'title' in k:
            # if 'title' in k and '2018' in v:
                possible_dates.append(v)

    temp_list = []
    for date in possible_dates:
        try:

            valid_date = datetime.datetime.strptime(date, "%Y%m%d" + date[-2:])
            valid_dates.append(valid_date)
            if date[-2:] not in temp_list:
                temp_list.append(date[-2:])
        except Exception as e:
            continue
    for suffix in temp_list:
        if possible_dates.__contains__(max(valid_dates).strftime("%Y%m%d" + suffix)):
            latest_date = max(valid_dates).strftime("%Y%m%d" + suffix)
            break

    date_xml_url = catalog_url + latest_date + '/catalog.xml'

    date_xml = requests.get(date_xml_url, verify=False)

    date_response = ET.fromstring(date_xml.content)

    for el in date_response.iter():
        for k, v in el.items():
            if 'urlPath' in k:
                if 'Control' in v:
                    urls_obj['det'] = catalog_wms + v
                if 'hourly' in v:
                    urls_obj['hourly'] = catalog_wms + v
                if 'day1' in v:
                    urls_obj['day1'] = catalog_wms + v
                if 'day2' in v:
                    urls_obj['day2'] = catalog_wms + v

    return urls_obj

# def get_hiwat_file():
#
#     hiwat_files = {}
#
#     for dir in os.listdir(HIWAT_storage):
#         if 'WRF' in dir:
#             WRF = os.path.join(HIWAT_storage, dir)
#             for store in os.listdir(WRF):
#                 if 'servir_hkh' in store:
#                     hiwat_dir = os.path.join(HIWAT_storage,dir)
#                     latest_dir = max([os.path.join(hiwat_dir, d) for d in os.listdir(hiwat_dir)], key=os.path.getmtime)
#                     for file in os.listdir(latest_dir):
#                         if 'hourly' in file:
#                             hiwat_files['hourly'] = os.path.join(latest_dir,file)
#                         if 'Control' in file:
#                             hiwat_files['det'] = os.path.join(latest_dir,file)
#                         if 'day1' in file:
#                             hiwat_files['day1'] = os.path.join(latest_dir,file)
#                         if 'day2' in file:
#                             hiwat_files['day2'] = os.path.join(latest_dir,file)
#
#     return hiwat_files

def get_hiwat_file():

    hiwat_files = {}
    latest_dir = max([os.path.join(HIWAT_storage, d) for d in os.listdir(HIWAT_storage) if os.path.isdir(os.path.join(HIWAT_storage, d)) if 'allhourly' not in d if 'RAPID_OUTPUT' not in d if 'failures' not in d])
    print(latest_dir)
    # print(latest_dir)
    for file in os.listdir(latest_dir):
        if 'hourly' in file:
            hiwat_files['hourly'] = os.path.join(latest_dir, file)
            os.path.join(latest_dir, file)
        if 'Control' in file:
            log.info(file)
            os.path.join(latest_dir, file)
            hiwat_files['det'] = os.path.join(latest_dir, file)
        if 'day1' in file:
            hiwat_files['day1'] = os.path.join(latest_dir, file)
        if 'day2' in file:
            hiwat_files['day2'] = os.path.join(latest_dir, file)

    return hiwat_files








